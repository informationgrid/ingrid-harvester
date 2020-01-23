import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {configure, getLogger} from 'log4js';
import * as sinon from 'sinon';
import {TestUtils} from './utils/test-utils';
import {IndexDocument} from '../app/model/index.document';
import {CkanSettings} from '../app/importer/ckan/ckan.settings';
import {CkanImporter} from '../app/importer/ckan/ckan.importer';
import {CkanMapper} from '../app/importer/ckan/ckan.mapper';
import {Organization} from '../app/model/generic.mapper';

const ckanDoc = require('./data/ckan_doc.json');

let log = getLogger();
configure('./log4js.json');

let resultZugbildungsplan = require('./data/result_ckan_bahn_Zugbildungsplan.json');

chai.use(chaiAsPromised);

describe('Import CKAN Bahn', function () {

    let indexDocumentCreateSpy;

    it('correct import of CKAN data', function (done) {

        log.info('Start test ...');

        var settings: CkanSettings = {
            ...CkanImporter.defaultSettings,
            alias: undefined,
            ckanBaseUrl: 'https://data.deutschebahn.com',
            defaultAttribution: 'Deutsche Bahn Datenportal',
            defaultDCATCategory: ['TRAN', 'TECH'],
            defaultMcloudSubgroup: ['railway'],
            providerField: 'organization',
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

    it('should map ckan to index correctly', async () => {
        const mapper = new CkanMapper({
            ...CkanImporter.defaultSettings,
            ckanBaseUrl: 'https://data.deutschebahn.com',
            index: 'xxx',
            includeTimestamp: true,
            markdownAsDescription: false
        }, {
            source: ckanDoc,
            harvestTime: null,
            issuedDate: null,
            currentIndexName: 'test',
            // @ts-ignore
            summary: {warnings: []}
        });
        const result = await IndexDocument.create(mapper);
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

    after(() => indexDocumentCreateSpy.restore());

});
