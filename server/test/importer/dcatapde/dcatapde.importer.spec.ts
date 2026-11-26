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
import sinon from 'sinon';
import { DcatapdeImporter } from '../../../app/importer/dcatapde/dcatapde.importer.js';
import { DcatapdeMapper } from '../../../app/importer/dcatapde/dcatapde.mapper.js';
import type { DcatapdeSettings } from '../../../app/importer/dcatapde/dcatapde.settings.js';
import { namespaces } from '../../../app/importer/namespaces.js';
import { Summary } from '../../../app/model/summary.js';
import { RequestDelegate } from '../../../app/utils/http-request.utils.js';
import * as MiscUtils from '../../../app/utils/misc.utils.js';

const SOURCE_URL = 'https://example.org/catalog.rdf';

// distribution, publisher and contact point are top-level resources referenced via rdf:resource
const CATALOG = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dcat="http://www.w3.org/ns/dcat#"
         xmlns:dct="http://purl.org/dc/terms/" xmlns:foaf="http://xmlns.com/foaf/0.1/" xmlns:vcard="http://www.w3.org/2006/vcard/ns#">
  <dcat:Dataset rdf:about="https://example.org/dataset/1">
    <dct:identifier>1</dct:identifier>
    <dct:title>Dataset 1</dct:title>
    <dct:description>Description 1</dct:description>
    <dcat:distribution rdf:resource="https://example.org/distribution/1"/>
    <dct:publisher rdf:resource="https://example.org/publisher/1"/>
    <dcat:contactPoint rdf:resource="https://example.org/contact/1"/>
  </dcat:Dataset>
  <dcat:Distribution rdf:about="https://example.org/distribution/1">
    <dcat:accessURL rdf:resource="https://example.org/data/1.csv"/>
    <dct:title>Distribution 1</dct:title>
  </dcat:Distribution>
  <foaf:Organization rdf:about="https://example.org/publisher/1">
    <foaf:name>Publisher 1</foaf:name>
  </foaf:Organization>
  <vcard:Organization rdf:about="https://example.org/contact/1">
    <vcard:fn>Contact 1</vcard:fn>
  </vcard:Organization>
</rdf:RDF>`;

describe('DcatapdeImporter: original document with referenced resources', function () {

    let sandbox: sinon.SinonSandbox;
    let harvestedData: string;

    before(async function () {
        sandbox = sinon.createSandbox();
        sandbox.stub(RequestDelegate.prototype, 'doRequest').resolves(CATALOG);
        const settings = { type: 'DCATAPDE', sourceURL: SOURCE_URL } as DcatapdeSettings;
        // only fetchAndParse() is used, so the importer is created without database and Elasticsearch
        const importer: any = Object.create(DcatapdeImporter.prototype);
        importer.settings = settings;
        const { response, store } = await importer.fetchAndParse(SOURCE_URL);
        const [datasetSubject] = store.getSubjects(DataFactory.namedNode(namespaces.RDF + 'type'), DataFactory.namedNode(namespaces.DCAT + 'Dataset'), null);
        harvestedData = new DcatapdeMapper(settings, datasetSubject, store, response, new Date(), new Summary('test', settings as any)).getHarvestedData();
    });

    after(function () {
        sandbox.restore();
    });

    it('contains the referenced distribution, publisher and contact point', function () {
        const root = MiscUtils.getDomParser().parseFromString(harvestedData, 'application/xml').documentElement;
        expect(root.localName).to.equal('RDF');
        const datasets = root.getElementsByTagNameNS(namespaces.DCAT, 'Dataset');
        expect(datasets).to.have.lengthOf(1);
        const dataset = datasets[0];
        expect(dataset.getElementsByTagNameNS(namespaces.DCAT, 'Distribution')).to.have.lengthOf(1);
        expect(dataset.getElementsByTagNameNS(namespaces.DCT, 'title')[1]?.textContent).to.equal('Distribution 1');
        expect(dataset.getElementsByTagNameNS(namespaces.FOAF, 'name')[0]?.textContent).to.equal('Publisher 1');
        expect(dataset.getElementsByTagNameNS(namespaces.VCARD, 'fn')[0]?.textContent).to.equal('Contact 1');
    });

    it('is an RDF/XML document that declares the namespaces only on rdf:RDF', function () {
        expect(harvestedData.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).to.be.true;
        expect(harvestedData.match(/xmlns:dct=/g)).to.have.lengthOf(1);
        // the other top-level resources are only contained inlined
        expect(harvestedData.match(/rdf:about="https:\/\/example.org\/distribution\/1"/g)).to.have.lengthOf(1);
    });

    it('has no unresolved references to them', function () {
        expect(harvestedData).not.to.contain('rdf:resource="https://example.org/distribution/1"');
        expect(harvestedData).not.to.contain('rdf:resource="https://example.org/publisher/1"');
        expect(harvestedData).not.to.contain('rdf:resource="https://example.org/contact/1"');
    });
});
