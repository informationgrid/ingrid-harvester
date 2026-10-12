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
import { parseRdfPayload } from '../../../app/importer/dcatap/dcatap.rdf.js';
import { namespaces } from '../../../app/importer/namespaces.js';
import settings from '../../data/dcatap/dessau-rosslau/config.json' with { type: 'json' };

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

    it('returns non-JSON payloads unchanged', function () {
        const rdf = fs.readFileSync('test/data/dcatap/opendata-hro/input/catalog.rdf', 'utf8');
        const { subject, uuid } = records[0];
        expect(DcatapImporter.getOriginalDocument(rdf, subject, uuid)).to.equal(rdf);
    });
});
