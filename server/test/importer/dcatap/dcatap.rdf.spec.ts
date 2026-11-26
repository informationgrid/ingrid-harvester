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

import { expect } from 'chai';
import { DataFactory } from 'n3';
import { detectContentType, parseRdfPayload } from '../../../app/importer/dcatap/dcatap.rdf.js';
import { namespaces } from '../../../app/importer/namespaces.js';

const RDF_XML = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dcat="http://www.w3.org/ns/dcat#" xmlns:dct="http://purl.org/dc/terms/">
    <dcat:Dataset rdf:about="https://example.org/dataset/1">
        <dct:title>Test</dct:title>
    </dcat:Dataset>
</rdf:RDF>`;

const JSON_LD = JSON.stringify({
    '@context': { dcat: 'http://www.w3.org/ns/dcat#', dct: 'http://purl.org/dc/terms/' },
    '@id': 'https://example.org/dataset/1',
    '@type': 'dcat:Dataset',
    'dct:title': 'Test'
});

const TURTLE = `<https://example.org/dataset/1> a <http://www.w3.org/ns/dcat#Dataset> ;
    <http://purl.org/dc/terms/title> "Test" .`;

async function getDatasetTitles(payload: string | object, url: string): Promise<string[]> {
    const store = await parseRdfPayload(payload, url);
    return store.getSubjects(DataFactory.namedNode(namespaces.RDF + 'type'), DataFactory.namedNode(namespaces.DCAT + 'Dataset'), null)
        .flatMap(subject => store.getObjects(subject, DataFactory.namedNode(namespaces.DCT + 'title'), null))
        .map(term => term.value);
}

describe('detectContentType', function () {

    it('detects JSON-LD', function () {
        expect(detectContentType(JSON_LD)).to.equal('application/ld+json');
        expect(detectContentType(`[${JSON_LD}]`)).to.equal('application/ld+json');
        expect(detectContentType(JSON.parse(JSON_LD))).to.equal('application/ld+json');
    });

    it('detects RDF/XML', function () {
        expect(detectContentType(RDF_XML)).to.equal('application/rdf+xml');
        expect(detectContentType('  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"/>')).to.equal('application/rdf+xml');
        expect(detectContentType('<!-- catalog --><rdf:RDF/>')).to.equal('application/rdf+xml');
    });

    it('detects Turtle, also starting with an IRI or a blank node', function () {
        expect(detectContentType('@prefix dcat: <http://www.w3.org/ns/dcat#> .')).to.equal('text/turtle');
        expect(detectContentType(TURTLE)).to.equal('text/turtle');
        expect(detectContentType('[ a <http://www.w3.org/ns/dcat#Dataset> ] .')).to.equal('text/turtle');
    });
});

describe('parseRdfPayload (format detection)', function () {

    it('reads `.xml` as RDF/XML', async function () {
        expect(await getDatasetTitles(RDF_XML, 'https://example.org/catalog.xml')).to.deep.equal(['Test']);
    });

    it('reads URLs with query string by their path extension', async function () {
        expect(await getDatasetTitles(RDF_XML, 'https://example.org/catalog.rdf?page=2')).to.deep.equal(['Test']);
    });

    it('detects the format of URLs without extension from the payload', async function () {
        expect(await getDatasetTitles(RDF_XML, 'https://example.org/catalog')).to.deep.equal(['Test']);
        expect(await getDatasetTitles(JSON_LD, 'https://example.org/catalog?format=jsonld')).to.deep.equal(['Test']);
        expect(await getDatasetTitles(JSON.parse(JSON_LD), 'https://example.org/catalog')).to.deep.equal(['Test']);
        expect(await getDatasetTitles(TURTLE, 'https://example.org/catalog')).to.deep.equal(['Test']);
    });
});
