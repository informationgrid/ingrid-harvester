import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {configure, getLogger} from 'log4js';
import {CkanSettings, CkanImporter} from '../server/ckan/ckan.importer';
import * as sinon from 'sinon';
import {IndexDocument} from '../server/model/index.document';
import {TestUtils} from './utils/test-utils';

let log = getLogger();
configure('./log4js.json');

let resultZugbildungsplan = require('./data/result_ckan_bahn_Zugbildungsplan.json');

chai.use(chaiAsPromised);

describe('Import CKAN Bahn', function () {

    let indexDocumentCreateSpy;

    it('correct import of CKAN data', async function () {

        log.info('Start test ...');

        var settings: CkanSettings = {
            alias: undefined,
            ckanBaseUrl: 'https://data.deutschebahn.com',
            description: 'Deutsche Bahn Datenportal',
            defaultDCATCategory: 'TRAN',
            defaultMcloudSubgroup: 'railway',
            dryRun: true,
            elasticSearchUrl: undefined,
            importer: undefined,
            includeTimestamp: true,
            index: undefined
        };
        let importer = new CkanImporter(settings);

        sinon.stub(importer.elastic, 'getIssuedDates').resolves(TestUtils.prepareIssuedDates(40, '2019-01-09T17:51:38.934Z'));

        indexDocumentCreateSpy = sinon.spy(IndexDocument, 'create');

        await importer.run();

        chai.expect(indexDocumentCreateSpy.called).to.be.true;
        let extraChecks = (actual, expected) => {
            chai.expect(actual.extras.metadata.harvested).not.to.be.null.and.empty;
        };

        await indexDocumentCreateSpy.getCall(0).returnValue.then(value => TestUtils.compareDocuments(value, resultZugbildungsplan, extraChecks));

    }).timeout(10000);

    after(() => indexDocumentCreateSpy.restore());

});
