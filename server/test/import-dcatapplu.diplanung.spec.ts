/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import {configure, getLogger} from "log4js";
import * as sinon from "sinon";
import {TestUtils} from "./utils/test-utils";
// import {CswSettings} from '../app/importer/csw/csw.settings';
// import {CswImporter} from '../app/importer/csw/csw.importer';
import {DcatappluImporter} from '../app/importer/dcatapplu/dcatapplu.importer'
import {DcatappluSettings} from '../app/importer/dcatapplu/dcatapplu.settings'
import {ProfileFactoryLoader} from "../app/profiles/profile.factory.loader";
import {IndexDocument} from "../app/model/index.document";
// import {mcloudDocument} from "../app/profiles/mcloud/model/index.document";
import { DiPlanungDocument } from "../app/profiles/diplanung/model/index.document";
import { DcatappluMapper } from "importer/dcatapplu/dcatapplu.mapper";

import {DataFactory} from "rdf-data-factory";
import { isomorphic } from "rdf-isomorphic";
import rdfParser from "rdf-parse";
const fs = require('fs');

let log = getLogger();
configure('./log4js.json');

chai.use(chaiAsPromised);

describe('Import DCAT AP PLU', function () {
    let xmlInputFile = fs.readFileSync('../server/test/data/input-dcatapplu-example.xml');
    xmlInputFile = xmlInputFile.replace(/\s+/, " ")  
        
    let indexDocumentCreateSpy;
    
    it('correct import of DCAT AP PLU', function (done) {
            
        log.info('Start test ...');

        // @ts-ignore
        const settings: DcatappluSettings = {
            catalogUrl: "http://localhost:8080/examples/plu-example-extended.xml",
            filterTags: null,
            filterThemes: null,
            providerPrefix: null,
            dcatappluProviderField: null,
            index: 'test',
            dryRun: true,
            startPosition: 1,
            proxy: null,
            priority: 1,
        };

        let importer = new DcatappluImporter(settings);

        sinon.stub(importer.elastic, 'getStoredData').resolves(TestUtils.prepareStoredData(1, {issued: '2019-01-09T17:51:38.934Z'}));

        indexDocumentCreateSpy = sinon.spy(DiPlanungDocument.prototype, 'create');

        importer.run.subscribe({
            complete: async () => {
                chai.expect(indexDocumentCreateSpy.called, 'Create method of index document has not been called').to.be.true;
                // let extraChecks = (actual, expected) => {
                //     // chai.expect(actual.extras.metadata.harvested).not.to.be.null.and.empty;
                // };

                try {
                    let transformed_data = await indexDocumentCreateSpy.getCall(0).returnValue.then(value => {
                        const data = startString + value.extras.transformed_data.dcat_ap_plu + endString
                        return data.replace(/\s+/, " ")
                    });
                    
                    // let isomorph = isomorphic(xmlInputFile, transformed_data)
                    // let message = isomorph ? "YES, data is isomorph" : "NO, data is not isomorph"
                    // log.info('message: ', isomorph);
                    done();
                } catch(e) {
                    done(e);
                }
            }
        });


    }).timeout(10000);

    after(() => indexDocumentCreateSpy.restore())

});

const endString = `</rdf:RDF>`
const startString = `
<?xml version="1.0"?>
<rdf:RDF
    xmlns:adms="http://www.w3.org/ns/adms#"
    xmlns:dcat="http://www.w3.org/ns/dcat#"
    xmlns:dcatde="http://dcat-ap.de/def/dcatde/"
    xmlns:dct="http://purl.org/dc/terms/"
    xmlns:foaf="http://xmlns.com/foaf/0.1/"
    xmlns:gml="http://www.opengis.net/gml/3.2#"
    xmlns:locn="http://www.w3.org/ns/locn#"
    xmlns:plu="https://specs.diplanung.de/plu/"
    xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    xmlns:skos="http://www.w3.org/2004/02/skos/core#"
    xmlns:vcard="http://www.w3.org/2006/vcard/ns#">
    <dcat:Catalog rdf:about="https://bauleitplanung.hamburg.de/">
        <dct:title>Bauleitplanung online</dct:title>
        <dct:description>Dies ist das Portal für die Recherche von Bauleitplanungen des Landes Hamburg. Hier finden Sie viele Informationen rund um das Themenfeld der Stadt- und Bauleitplanung. Zudem haben wir Ihnen verschiedene Hilfestellungen und Anleitungen für die Arbeit mit Bauleitplanung online bereitgestellt. </dct:description>
        <foaf:homepage rdf:resource="https://bauleitplanung.hamburg.de/"/>
        <dct:identifier>17b94f6a-28ba-11e7-af94-0050568a354d</dct:identifier>
        <dct:issued>2022-05-01T00:00:00.000Z</dct:issued>
        <dct:modified>2022-03-02T23:00:00.000Z</dct:modified>
        <dct:language rdf:resource="http://publications.europa.eu/resource/authority/language/DEU"/>
        <dct:publisher>
            <foaf:Agent>
                <foaf:name>Freie und Hansestadt Hamburg</foaf:name>
                <dct:type rdf:resource="http://purl.org/adms/publishertype/LocalAuthority"/>
            </foaf:Agent>
        </dct:publisher>
        <dcat:themeTaxonomy>
            <skos:ConceptScheme>
                <dct:title>helo</dct:title>
            </skos:ConceptScheme>
        </dcat:themeTaxonomy>
        <dcat:dataset rdf:resource="https://bauleitplanung.hamburg.de/verfahren/17b94f6a-28ba-11e7-af94-0050568a354d/public/detail/1" />
    </dcat:Catalog>
`