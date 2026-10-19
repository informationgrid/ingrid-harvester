/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2026 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

import DataFactory from '@rdfjs/data-model';
import type { Quad } from '@rdfjs/types';
import jsonld from 'jsonld';
import log4js from 'log4js';
import { Store } from 'n3';
import { type ParseOptions, rdfParser } from 'rdf-parse';
import { Readable } from 'stream';

const log = log4js.getLogger(import.meta.filename);

/**
 * Parses an RDF payload string into an in-memory N3/RDF.js Quad Store.
 * The format is `contentType` if given (e.g. `application/rdf+xml`), else detected from the extension of `baseIRI`
 * (`.xml` is read as RDF/XML), else from the payload itself (see `detectContentType()`).
 */
export async function parseRdfPayload(payload: string | object, baseIRI: string, contentType?: string): Promise<Store & { rawQuads?: Quad[] }> {
    const store: Store & { rawQuads?: Quad[] } = new Store();
    store.rawQuads = [];
    if (!payload || (typeof payload === 'string' && !payload.trim())) {
        return store;
    }

    contentType ??= getContentTypeFromUrl(baseIRI) ?? detectContentType(payload);

    // JSON-LD has to be handled separately because of streaming-related issues when using rdf-parse
    if (contentType == 'application/ld+json' || contentType == 'application/json') {
        const inputObj = typeof payload === 'string' ? JSON.parse(payload) : payload;
        const quads = (await jsonld.toRDF(inputObj, {
            base: baseIRI,
            factory: DataFactory
        })) as Quad[];
        store.addQuads(quads);
        return Object.assign(store, { rawQuads: quads });
    }
    else {
        const stream = Readable.from([payload]);
        const parseOptions: ParseOptions = { contentType, baseIRI };
        const quadStream = rdfParser.parse(stream, parseOptions);

        return new Promise((resolve, reject) => {
            quadStream.on('data', (quad: Quad) => {
                store.rawQuads.push(quad);
                store.addQuad(quad);
            });
            quadStream.on('end', () => resolve(store));
            quadStream.on('error', (err) => {
                log.error('Error parsing RDF payload', err);
                reject(err);
            });
        });
    }
}

/**
 * @returns the RDF content type of the extension of `url` (also without query string), `application/rdf+xml` for `.xml`,
 * `url` itself if it is a media type, else undefined
 */
function getContentTypeFromUrl(url: string): string | undefined {
    let contentType = rdfParser.getContentTypeFromExtension(url);
    if (!contentType && url.includes('/')) {
        try {
            contentType = rdfParser.getContentTypeFromExtension(new URL(url).pathname.toLowerCase());
        }
        catch (ignored) {
            if (url.startsWith('application/')) {
                contentType = url;
            }
        }
    }
    // RDF/XML is also served as plain XML (e.g. CKAN `catalog.xml`)
    if (contentType == 'application/xml' || contentType == 'text/xml') {
        return 'application/rdf+xml';
    }
    return contentType || undefined;
}

/**
 * Detects the format of a payload without known content type (e.g. URLs without extension or with a format query parameter):
 * parsed objects, `{` and `[{` are JSON-LD, an XML declaration, comment or tag (`<?xml`, `<!--`, `<rdf:RDF`) is RDF/XML,
 * everything else Turtle (also `<http://...>`, an IRI as first subject).
 */
export function detectContentType(payload: string | object): string {
    if (typeof payload !== 'string') {
        return 'application/ld+json';
    }
    const start = payload.trimStart();
    // `[` is also a Turtle blank node, JSON arrays start with an object (or are empty)
    if (start.startsWith('{') || /^\[\s*[{\]]/.test(start)) {
        return 'application/ld+json';
    }
    if (/^<(\?xml|!|[A-Za-z_][\w.-]*(:[A-Za-z_][\w.-]*)?[\s/>])/.test(start)) {
        return 'application/rdf+xml';
    }
    return 'text/turtle';
}
