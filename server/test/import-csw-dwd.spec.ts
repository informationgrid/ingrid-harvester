/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import {configure, getLogger} from "log4js";
import * as sinon from "sinon";
import {TestUtils} from "./utils/test-utils";
import {CswImporter} from '../app/importer/csw/csw.importer';
import {ProfileFactoryLoader} from "../app/profiles/profile.factory.loader";

let log = getLogger();
configure('./log4js.json');

let resultFlussgebietseinheiten = require('./data/result_csw_dwd_RelativeFeuchteanRBSNStationen.json');

chai.use(chaiAsPromised);

describe('Import CSW DWD', function () {

    let indexDocumentCreateSpy;

    it('correct import of CSW-DWD data', function (done) {

        log.info('Start test ...');

        // @ts-ignore
        const settings: CswSettings = {
            dryRun: true,
            type: "CSW",
            startPosition: 1,
            elasticSearchUrl: "http://localhost:9200",
            index: "csw_dwd",
            indexType: "base",
            alias: "mcloud",
            getRecordsUrl: "https://cdc.dwd.de/catalogue/srv/en/csw",
            proxy: null,
            defaultMcloudSubgroup: ["climate"],
            defaultDCATCategory: ["TRAN"],
            defaultAttribution: "Climate Data Centre (CDC) Katalog des DWD",
            includeTimestamp: true,
            recordFilter: `
                <ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>identifier</ogc:PropertyName>
                        <ogc:Literal>de.dwd.geoserver.fach.RBSN_RH</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                </ogc:Filter>`
        };
        let importer = new CswImporter(ProfileFactoryLoader.get(), settings);

        sinon.stub(importer.elastic, 'getStoredData').resolves(TestUtils.prepareStoredData(40, {issued: '2019-01-09T17:51:38.934Z'}));

        indexDocumentCreateSpy = sinon.spy(ProfileFactoryLoader.get().getIndexDocument(), 'create');

        importer.run.subscribe({
            complete: async () => {
                chai.expect(indexDocumentCreateSpy.called).to.be.true;
                let extraChecks = (actual, expected) => {
                    // chai.expect(actual.extras.metadata.harvested).not.to.be.null.and.empty;
                };

                // await chai.expect(indexDocumentCreateSpy.getCall(0).returnValue).to.eventually.deep.include(resultFlussgebietseinheiten);

                try {
                    await indexDocumentCreateSpy.getCall(0).returnValue.then(value => TestUtils.compareDocuments(value, resultFlussgebietseinheiten, extraChecks));
                    done();
                } catch (e) {
                    done(e);
                }
            }
        });

    }).timeout(10000);

    after(() => indexDocumentCreateSpy.restore())

});
