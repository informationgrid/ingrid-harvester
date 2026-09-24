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

import type { Quad } from '@rdfjs/types';
import log4js from 'log4js';
import { Store } from 'n3';
import { rdfParser } from 'rdf-parse';
import { Readable } from 'stream';
import { namespaces } from '../namespaces.js';

const log = log4js.getLogger(import.meta.filename);

export const RDF_PREFIX_MAP: Record<string, string> = {
    [namespaces.RDF]: 'rdf',
    [namespaces.RDFS]: 'rdfs',
    [namespaces.DCAT]: 'dcat',
    [namespaces.DCATAP]: 'dcatap',
    [namespaces.DCATDE]: 'dcatde',
    [namespaces.DCT]: 'dct',
    [namespaces.FOAF]: 'foaf',
    [namespaces.LOCN]: 'locn',
    [namespaces.HYDRA]: 'hydra',
    [namespaces.SKOS]: 'skos',
    [namespaces.SCHEMA]: 'schema',
    [namespaces.VCARD]: 'vcard',
    [namespaces.OGC]: 'ogc',
    [namespaces.ADMS]: 'adms',
    [namespaces.GEOSPARQL]: 'geosparql',
    [namespaces.OWL]: 'owl',
    [namespaces.XSD]: 'xsd'
};

/**
 * Parses an RDF payload string into an in-memory N3/RDF.js Quad Store.
 */
export async function parseRdfPayload(payload: string, contentType = 'application/rdf+xml'): Promise<Store & { rawQuads?: Quad[] }> {
    const store: Store & { rawQuads?: Quad[] } = new Store();
    store.rawQuads = [];
    if (!payload || !payload.trim()) {
        return store;
    }
    const stream = Readable.from([payload]);
    const quadStream = rdfParser.parse(stream, { contentType });

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
