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
import {CswSettings} from '../app/importer/csw/csw.settings';
import {CswImporter} from '../app/importer/csw/csw.importer';
import {ProfileFactoryLoader} from "../app/profiles/profile.factory.loader";

let log = getLogger();
configure('./log4js.json');

let resultFlussgebietseinheiten = require('./data/result_csw_bfg_Flussgebietseinheiten.json');

chai.use(chaiAsPromised);

describe('Import CSW BFG', function () {

    let indexDocumentCreateSpy;

    it('correct import of CSW-BFG data', function (done) {

        log.info('Start test ...');

        // @ts-ignore
        const settings: CswSettings = {
            dryRun: true,
            startPosition: 1,
            getRecordsUrl: "https://geoportal.bafg.de/csw/api",
            proxy: null,
            defaultMcloudSubgroup: ["waters"],
            defaultDCATCategory: ["TRAN", "TECH"],
            defaultAttribution: "Bundesanstalt für Gewässerkunde",
            defaultAttributionLink: "https://www.bafg.de/",
            httpMethod: "POST",
            recordFilter: `
                <ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>identifier</ogc:PropertyName>
                        <ogc:Literal>82f97ad0-198b-477e-a440-82fa781624eb</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                </ogc:Filter>`
        };

        let importer = new CswImporter(ProfileFactoryLoader.get(), settings);

        sinon.stub(importer.elastic, 'getStoredData').resolves(TestUtils.prepareStoredData(40, {issued: '2019-01-09T17:51:38.934Z'}));

        indexDocumentCreateSpy = sinon.spy(ProfileFactoryLoader.get().getIndexDocument(), 'create');

        importer.run.subscribe({
            complete: async () => {
                chai.expect(indexDocumentCreateSpy.called, 'Create method of index document has not been called').to.be.true;
                let extraChecks = (actual, expected) => {
                    // chai.expect(actual.extras.metadata.harvested).not.to.be.null.and.empty;
                };

                try {
                    await indexDocumentCreateSpy.getCall(0).returnValue.then(value => TestUtils.compareDocuments(value, resultFlussgebietseinheiten, extraChecks));
                    done();
                } catch(e) {
                    done(e);
                }
            }
        });


    }).timeout(10000);

    after(() => indexDocumentCreateSpy.restore())

});
