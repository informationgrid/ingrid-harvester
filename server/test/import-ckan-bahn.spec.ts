import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {configure, getLogger} from 'log4js';
import * as sinon from 'sinon';
import {TestUtils} from './utils/test-utils';
import {IndexDocument} from '../app/model/index.document';
import {CkanSettings} from '../app/importer/ckan/ckan.settings';
import {CkanImporter} from '../app/importer/ckan/ckan.importer';

let log = getLogger();
configure('./log4js.json');

let resultZugbildungsplan = require('./data/result_ckan_bahn_Zugbildungsplan.json');

chai.use(chaiAsPromised);

describe('Import CKAN Bahn', function () {

    let indexDocumentCreateSpy;

    it('correct import of CKAN data', function (done) {

        log.info('Start test ...');

        var settings: CkanSettings = {
            alias: undefined,
            ckanBaseUrl: 'https://data.deutschebahn.com',
            defaultAttribution: 'Deutsche Bahn Datenportal',
            defaultDCATCategory: ['TRAN'],
            defaultMcloudSubgroup: ['railway'],
            dryRun: true,
            elasticSearchUrl: undefined,
            type: undefined,
            includeTimestamp: true,
            index: undefined,
            filterTags: ['Fernverkehr', 'Wagenreihung']
        };
        let importer = new CkanImporter(settings);

        sinon.stub(importer.elastic, 'getIssuedDates').resolves(TestUtils.prepareIssuedDates(40, '2019-01-09T17:51:38.934Z'));

        indexDocumentCreateSpy = sinon.spy(IndexDocument, 'create');

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

    after(() => indexDocumentCreateSpy.restore());

});
