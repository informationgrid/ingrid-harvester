/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
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

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {configure, getLogger} from 'log4js';
import * as sinon from 'sinon';
import {TestUtils} from '../utils/test-utils';
import {CkanSettings, defaultCKANSettings} from '../../app/importer/ckan/ckan.settings';
import {CkanImporter} from '../../app/importer/ckan/ckan.importer';
import {CkanMapper} from '../../app/importer/ckan/ckan.mapper';
import {Organization} from "../../app/model/agent";
import {ProfileFactoryLoader} from "../../app/profiles/profile.factory.loader";

const ckanDoc = require('../data/ckan_doc.json');

let log = getLogger();
configure('./log4js.json');

let resultZugbildungsplan = require('../data/result_ckan_bahn_Zugbildungsplan.json');

chai.use(chaiAsPromised);

describe('Import CKAN Bahn', function () {

    let indexDocumentCreateSpy;

    it.skip('correct import of CKAN data', function (done) {

        log.info('Start test ...');

        var settings: CkanSettings = {
            ...defaultCKANSettings,
            ckanBaseUrl: 'https://data.deutschebahn.com',
            defaultAttribution: 'Deutsche Bahn Datenportal',
            defaultDCATCategory: ['TRAN', 'TECH'],
            defaultMcloudSubgroup: ['railway'],
            providerField: 'organization',
            dryRun: true,
            type: undefined,
            index: undefined,
            filterTags: ['Fernverkehr', 'Wagenreihung']
        };
        let importer = new CkanImporter(settings);

        sinon.stub(importer.elastic, 'getStoredData').resolves(TestUtils.prepareStoredData(40, {issued: '2019-01-09T17:51:38.934Z'}));

        indexDocumentCreateSpy = sinon.spy(ProfileFactoryLoader.get().getIndexDocument(), 'create');

        importer.run.subscribe({
            complete: async () => {
                chai.expect(indexDocumentCreateSpy.called).to.be.true;
                let extraChecks = (actual, expected) => {
                    chai.expect(actual.extras.metadata.harvested).not.to.be.null.and.empty;
                };

                // get correct dataset
                let index = indexDocumentCreateSpy.args.findIndex(arg => arg[0].source.title === 'Zugbildungsplan A -Reihung- (ZpAR)');

                try {
                    await indexDocumentCreateSpy.getCall(index).returnValue.then(value => TestUtils.compareDocuments(value, resultZugbildungsplan, extraChecks));
                    done();
                } catch (e) {
                    done(e);
                }
            }
        });


    }).timeout(10000);

    it('should map ckan to index correctly', async () => {
        const mapper = new CkanMapper({
            ...defaultCKANSettings,
            ckanBaseUrl: 'https://data.deutschebahn.com',
            index: 'xxx',
            markdownAsDescription: false
        }, {
            source: ckanDoc,
            harvestTime: null,
            issuedDate: null,
            currentIndexName: 'test',
            // @ts-ignore
            summary: {warnings: []}
        });
        const result = await ProfileFactoryLoader.get().getIndexDocument().create(mapper);
        chai.expect(result.title).to.eq('Reisezentren');
        chai.expect(result.description).to.eq('Die Reisezentren enthalten eine Liste der Verkaufsstellen inkl. Adressen, Koordinaten und Öffnungszeiten.');
        chai.expect(result.modified.toString()).to.eq(new Date('2019-09-11T07:16:44.317Z').toString());
        chai.expect(result.keywords.length).to.eq(1);
        chai.expect(result.keywords[0]).to.eq('Koordinaten');
        chai.expect(result.publisher.length).to.eq(1);
        chai.expect((<Organization>result.publisher[0]).organization).to.eq('DB Vertrieb GmbH');
        chai.expect(result.distribution.length).to.eq(1);
        chai.expect(result.distribution[0].title).to.eq('Reisezentrenliste (Stand: 09/2018)');
        chai.expect(result.distribution[0].accessURL).to.eq('http://download-data.deutschebahn.com/static/datasets/reisezentren/VSRz201703.csv');
        chai.expect(result.distribution[0].format[0]).to.eq('CSV');
        chai.expect(result.distribution[0].description).to.eq('Reisezentrenliste der DB Vertrieb GmbH');
        chai.expect(result.distribution[0].modified.toString()).to.eq(new Date('2018-09-24T09:12:55.1358119').toString());
        chai.expect(result.distribution[0].byteSize).to.eq(10325);
    });

    after(() => indexDocumentCreateSpy?indexDocumentCreateSpy.restore():null);

});
