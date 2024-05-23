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
import {TestUtils} from "../utils/test-utils";
import {IndexDocument} from '../../app/model/index.document';
import {OaiSettings} from "../../app/importer/oai/oai.settings";
import {OaiImporter} from "../../app/importer/oai/iso19139/oai.importer";
import {ProfileFactoryLoader} from "../../app/profiles/profile.factory.loader";
import {mcloudDocument} from "../../app/profiles/mcloud/model/index.document";

let log = getLogger();
configure('./log4js.json');

let resultWMSDienst = require('../data/result_oai_dwd_WMS-Dienst.json');

chai.use(chaiAsPromised);

describe('Import OAI DWD', function () {

    let indexDocumentCreateSpy;

    it('correct import of OAI-DWD data', function (done) {

        log.info('Start test ...');

        // @ts-ignore
        const settings: OaiSettings = {
            dryRun: true,
            index: "oai_dwd",
            priority: null,
            type: "OAI",
            maxRecords: 100,
            startPosition: 1,
            customCode: null,
            defaultMcloudSubgroup: ["climate"],
            defaultDCATCategory: ["ENVI"],
            providerUrl: "https://oai.dwd.de/oai/provider",
            set: "mCLOUD",
            defaultAttribution: "DWD",
            defaultAttributionLink: "https://oai.dwd.de/oai/provider?verb=ListRecords&metadataPrefix=iso19139&set=mCLOUD"
        };

        let importer = new OaiImporter(settings);

        sinon.stub(importer.elastic, 'getStoredData').resolves(TestUtils.prepareStoredData(40, {issued: '2019-01-09T17:51:38.934Z'}));

        indexDocumentCreateSpy = sinon.spy(mcloudDocument.prototype, 'create');

        importer.run.subscribe({
            complete: async () => {
                chai.expect(indexDocumentCreateSpy.called).to.be.true;
                let extraChecks = (actual, expected) => {
                    // chai.expect(actual.extras.metadata.harvested).not.to.be.null.and.empty;
                };

                // await chai.expect(indexDocumentCreateSpy.getCall(0).returnValue).to.eventually.deep.include(resultFlussgebietseinheiten);

                try {
                    await indexDocumentCreateSpy.getCall(0).returnValue.then(value => TestUtils.compareDocuments(value, resultWMSDienst, extraChecks));
                    done();
                } catch (e) {
                    done(e);
                }
            }
        });

    }).timeout(10000);

    after(() => indexDocumentCreateSpy.restore())

});
