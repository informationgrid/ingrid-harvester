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
 */
export async function parseRdfPayload(payload: string | object, baseIRI: string): Promise<Store & { rawQuads?: Quad[] }> {
    const store: Store & { rawQuads?: Quad[] } = new Store();
    store.rawQuads = [];
    if (!payload || (typeof payload === 'string' && !payload.trim())) {
        return store;
    }

    let contentType = rdfParser.getContentTypeFromExtension(baseIRI);
    if (!contentType && baseIRI.includes('/')) {
        try {
            contentType = rdfParser.getContentTypeFromExtension(new URL(baseIRI).pathname);
        }
        catch (ignored) {
            if (baseIRI.startsWith('application/')) {
                contentType = baseIRI;
            }
        }
    }

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
        // TODO if more fine grained content type detection is needed, inject its result into parseOptions
        const parseOptions: ParseOptions = { path: new URL(baseIRI).pathname.toLowerCase(), baseIRI };
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
