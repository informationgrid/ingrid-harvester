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
import fs from 'fs';
import { DataFactory } from 'n3';
import { DcatapImporter } from '../../../app/importer/dcatap/dcatap.importer.js';
import { DcatapMapper } from '../../../app/importer/dcatap/dcatap.mapper.js';
import { parseRdfPayload } from '../../../app/importer/dcatap/dcatap.rdf.js';
import type { DcatapSettings } from '../../../app/importer/dcatap/dcatap.settings.js';
import { namespaces } from '../../../app/importer/namespaces.js';
import { Summary } from '../../../app/model/summary.js';
import * as MiscUtils from '../../../app/utils/misc.utils.js';
import settings from '../../data/dcatap/dessau-rosslau/config.json' with { type: 'json' };
import rdfSettings from '../../data/dcatap/opendata-hro/config.json' with { type: 'json' };

describe('DcatapImporter.getOriginalDocument', function () {

    const datasetIds = [
        'a537c7007dd44945bc378eb59e10314c',
        'a537c7007dd44945bc378eb59e10314c_0',
        'a537c7007dd44945bc378eb59e10314c_29'
    ];

    let payload: string;
    let input: any;
    let records: { subject: any, uuid: string }[];

    before(async function () {
        payload = fs.readFileSync('test/data/dcatap/dessau-rosslau/input/3.0.0.json', 'utf8');
        input = JSON.parse(payload);
        const store = await parseRdfPayload(input, settings.sourceURL);
        records = store.getSubjects(
            DataFactory.namedNode(namespaces.RDF + 'type'),
            DataFactory.namedNode(namespaces.DCAT + 'Dataset'),
            null
        ).map(subject => ({
            subject,
            uuid: store.getObjects(subject, DataFactory.namedNode(namespaces.DCT + 'identifier'), null)[0]?.value
        }));
    });

    it('keeps the wrapper and only the dataset of the record (JSON-LD object)', function () {
        expect(records).to.have.lengthOf(3);
        const found = [];
        for (const { subject, uuid } of records) {
            const document = DcatapImporter.getOriginalDocument(input, subject, uuid);
            const { 'dcat:dataset': datasets, ...wrapper } = document;
            const { 'dcat:dataset': ignored, ...expectedWrapper } = input;
            expect(wrapper).to.deep.equal(expectedWrapper);
            expect(datasets).to.have.lengthOf(1);
            expect(datasets[0]['dct:identifier']).to.equal(uuid);
            found.push(datasets[0]['@id']);
        }
        expect(found).to.have.members(datasetIds);
        // input must not be modified
        expect(input['dcat:dataset']).to.have.lengthOf(3);
    });

    it('returns a JSON string for a JSON string payload', function () {
        const { subject, uuid } = records[0];
        const document = DcatapImporter.getOriginalDocument(payload, subject, uuid);
        expect(document).to.be.a('string');
        expect(JSON.parse(document)['dcat:dataset']).to.have.lengthOf(1);
    });

    it('returns non-JSON payloads without dataset element unchanged', function () {
        const rdf = fs.readFileSync('test/data/dcatap/opendata-hro/input/catalog.rdf', 'utf8');
        const { subject, uuid } = records[0];
        expect(DcatapImporter.getOriginalDocument(rdf, subject, uuid)).to.equal(rdf);
    });
});

describe('DcatapImporter.getOriginalDocument (RDF/XML)', function () {

    const datasetIds = [
        '98155429-d260-4d6c-b1d0-3dd0c94d6ee0',
        '5f7ddbd5-84e0-4eaf-8e24-4484e46527fb',
        'b6804103-8124-459d-9e6a-542c425d7e29'
    ];

    let payload: string;
    let mappers: DcatapMapper[];

    before(async function () {
        payload = fs.readFileSync('test/data/dcatap/opendata-hro/input/catalog.rdf', 'utf8');
        const store = await parseRdfPayload(payload, rdfSettings.sourceURL);
        mappers = store.getSubjects(
            DataFactory.namedNode(namespaces.RDF + 'type'),
            DataFactory.namedNode(namespaces.DCAT + 'Dataset'),
            null
        ).map(subject => new DcatapMapper(rdfSettings as DcatapSettings, subject, store, payload, new Date(), new Summary('test', rdfSettings as any)));
    });

    it('keeps the root element and non-dataset content, but only the dataset of the record', function () {
        expect(mappers).to.have.lengthOf(3);
        const found = [];
        for (const mapper of mappers) {
            const datasetElement = mapper.getDatasetElement();
            expect(datasetElement).to.exist;
            const document = DcatapImporter.getOriginalDocument(payload, null, null, datasetElement);
            expect(document).to.match(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<rdf:RDF /);

            const root = MiscUtils.getDomParser().parseFromString(document, 'application/xml').documentElement;
            expect(root.getElementsByTagNameNS(namespaces.HYDRA, 'PagedCollection')).to.have.lengthOf(1);
            const datasets = root.getElementsByTagNameNS(namespaces.DCAT, 'Dataset');
            expect(datasets).to.have.lengthOf(1);
            expect(datasets[0].toString()).to.equal(datasetElement.toString());
            found.push(datasets[0].getElementsByTagNameNS(namespaces.DCT, 'identifier')[0].textContent);
        }
        expect(found).to.have.members(datasetIds);
    });

    it('returns an rdf:RDF document with only the dataset element as harvested data', function () {
        for (const mapper of mappers) {
            const harvestedData = mapper.getHarvestedData();
            expect(harvestedData).to.match(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<rdf:RDF /);
            const root = MiscUtils.getDomParser().parseFromString(harvestedData, 'application/xml').documentElement;
            // no catalog, hydra or other datasets, only the record's dataset (its distributions are already nested in the test data)
            expect(Array.from(root.childNodes).filter(node => node.nodeType === 1).map(node => (node as Element).localName)).to.deep.equal(['Dataset']);
            expect(root.getElementsByTagNameNS(namespaces.DCAT, 'Dataset')[0].toString()).to.equal(mapper.getDatasetElement().toString());
        }
    });
});

describe('DcatapImporter.getOriginalDocument (RDF/XML with references)', function () {

    const base = 'https://example.org';
    const payload = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dcat="http://www.w3.org/ns/dcat#" xmlns:dct="http://purl.org/dc/terms/" xmlns:foaf="http://xmlns.com/foaf/0.1/" xmlns:hydra="http://www.w3.org/ns/hydra/core#">
  <hydra:PagedCollection rdf:about="${base}/catalog.rdf?page=1"/>
  <dcat:Dataset rdf:about="${base}/dataset/a">
    <dct:identifier>a</dct:identifier>
    <dct:title>A</dct:title>
    <dcat:distribution rdf:resource="${base}/dataset/a/resource/1"/>
    <dcat:distribution rdf:resource="${base}/dataset/a/resource/2"/>
  </dcat:Dataset>
  <dcat:Dataset rdf:about="${base}/dataset/b">
    <dct:identifier>b</dct:identifier>
    <dct:title>B</dct:title>
    <dcat:distribution rdf:resource="${base}/dataset/b/resource/1"/>
  </dcat:Dataset>
  <dcat:Distribution rdf:about="${base}/dataset/a/resource/1"><dct:title>A1</dct:title></dcat:Distribution>
  <dcat:Distribution rdf:about="${base}/dataset/a/resource/2"><dct:title>A2</dct:title></dcat:Distribution>
  <dcat:Distribution rdf:about="${base}/dataset/b/resource/1"><dct:title>B1</dct:title></dcat:Distribution>
  <dcat:Catalog rdf:about="${base}">
    <dct:title>Catalog</dct:title>
    <foaf:homepage rdf:resource="${base}"/>
    <dcat:dataset rdf:resource="${base}/dataset/a"/>
    <dcat:dataset rdf:resource="${base}/dataset/b"/>
    <dcat:dataset rdf:resource="${base}/dataset/other-page"/>
    <dcat:dataset>
      <dcat:Dataset rdf:about="${base}/dataset/c">
        <dct:identifier>c</dct:identifier>
        <dct:title>C</dct:title>
      </dcat:Dataset>
    </dcat:dataset>
  </dcat:Catalog>
</rdf:RDF>`;

    let documents: Map<string, Element>;

    before(async function () {
        const store = await parseRdfPayload(payload, `${base}/catalog.rdf`);
        documents = new Map();
        for (const subject of store.getSubjects(DataFactory.namedNode(namespaces.RDF + 'type'), DataFactory.namedNode(namespaces.DCAT + 'Dataset'), null)) {
            const mapper = new DcatapMapper(rdfSettings as DcatapSettings, subject, store, payload, new Date(), new Summary('test', rdfSettings as any));
            const document = DcatapImporter.getOriginalDocument(payload, subject, null, mapper.getDatasetElement());
            documents.set(subject.value, MiscUtils.getDomParser().parseFromString(document, 'application/xml').documentElement);
        }
    });

    const titles = (root: Element, localName: string) => Array.from(root.getElementsByTagNameNS(namespaces.DCAT, localName))
        .map(element => element.getElementsByTagNameNS(namespaces.DCT, 'title')[0]?.textContent);
    const catalogDatasetRefs = (root: Element) => Array.from(root.getElementsByTagNameNS(namespaces.DCAT, 'dataset'))
        .map(element => element.getAttributeNS(namespaces.RDF, 'resource') || element.getElementsByTagNameNS(namespaces.DCAT, 'Dataset')[0].getAttributeNS(namespaces.RDF, 'about'));

    it('keeps only the referenced distributions of a top-level dataset', function () {
        const root = documents.get(`${base}/dataset/a`);
        expect(titles(root, 'Dataset')).to.deep.equal(['A']);
        expect(titles(root, 'Distribution')).to.deep.equal(['A1', 'A2']);
        expect(titles(root, 'Catalog')).to.deep.equal(['Catalog']);
        expect(catalogDatasetRefs(root)).to.deep.equal([`${base}/dataset/a`]);
        expect(root.getElementsByTagNameNS(namespaces.HYDRA, 'PagedCollection')).to.have.lengthOf(1);

        const other = documents.get(`${base}/dataset/b`);
        expect(titles(other, 'Dataset')).to.deep.equal(['B']);
        expect(titles(other, 'Distribution')).to.deep.equal(['B1']);
        expect(catalogDatasetRefs(other)).to.deep.equal([`${base}/dataset/b`]);
    });

    it('keeps a dataset nested in the catalog without other datasets', function () {
        const root = documents.get(`${base}/dataset/c`);
        expect(titles(root, 'Dataset')).to.deep.equal(['C']);
        expect(titles(root, 'Distribution')).to.be.empty;
        expect(catalogDatasetRefs(root)).to.deep.equal([`${base}/dataset/c`]);
        expect(root.getElementsByTagNameNS(namespaces.HYDRA, 'PagedCollection')).to.have.lengthOf(1);
    });
});
