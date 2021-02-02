import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";
import {configure, getLogger} from "log4js";
import {TestUtils} from "./utils/test-utils";
import {IndexDocument} from '../app/model/index.document';
import {ExcelImporter} from '../app/importer/excel/excel.importer';
import {ExcelSettings} from '../app/importer/excel/excel.settings';
import {ExcelMapper} from '../app/importer/excel/excel.mapper';

let log = getLogger();
configure('./log4js.json');

let resultMauttabelle = require('./data/result_excel_mauttabelle.json');
let resultBathymetrien = require('./data/result_excel_bathymetrien.json');
let resultBadegewaesser = require('./data/result_excel_badegewaesser.json');

chai.use(chaiAsPromised);

describe('Import Excel', function () {

    let indexDocumentCreateSpy;

    it('correct import of Excel file', function (done) {

        log.info('Start test ...');

        let settings: ExcelSettings = {
            dryRun: true,
            filePath: 'test/data/data-test.xlsx',
            defaultDCATCategory: ['DEFAULT_TRAN', "XXX"],
            alias: undefined,
            elasticSearchUrl: undefined,
            type: undefined,
            includeTimestamp: undefined,
            index: undefined
        };
        let importer = new ExcelImporter(settings);

        sinon.stub(importer.elastic, 'getStoredData').resolves(TestUtils.prepareStoredData(3, {issued: "2019-01-08T16:33:11.168Z"}));

        indexDocumentCreateSpy = sinon.spy(IndexDocument, 'create');

        importer.run.subscribe({
            complete: async () => {
                chai.expect(indexDocumentCreateSpy.calledThrice).to.be.true;
                try {
                    await indexDocumentCreateSpy.getCall(0).returnValue.then(value => TestUtils.compareDocuments(value, resultMauttabelle));
                    await indexDocumentCreateSpy.getCall(1).returnValue.then(value => TestUtils.compareDocuments(value, resultBathymetrien));
                    await indexDocumentCreateSpy.getCall(2).returnValue.then(value => TestUtils.compareDocuments(value, resultBadegewaesser));
                    done();
                } catch (e) {
                    done(e);
                }
            }
        });
    }).timeout(10000);

    it('should handle date range', function () {
        let mapper = new ExcelMapper(null, {});
        mapper.columnMap = {Zeitraum: 22};
        mapper.columnValues = [];

        mapper.columnValues[22] = "12.08.2018";
        chai.expect(mapper.getTemporal()).to.deep.equal([{gte: new Date("08/12/2018"), lte: new Date("08/12/2018")}]);

        //mapper.columnValues[22] = "heute";
        //chai.expect(mapper.getTemporal().custom).to.equal("heute");

        mapper.columnValues[22] = "12.08.2018 - 25.09.2018";
        chai.expect(mapper.getTemporal()).to.deep.equal([{gte: new Date("08/12/2018"), lte: new Date("09/25/2018")}]);

        mapper.columnValues[22] = "12.08.2018 - heute";
        chai.expect(mapper.getTemporal()).to.deep.equal([{gte: new Date("08/12/2018"), lte: new Date().setTime(0)}]);

        //mapper.columnValues[22] = "2017";
        //chai.expect(mapper.getTemporal()).to.deep.equal({custom: "2017"});
    });

    after(() => indexDocumentCreateSpy && indexDocumentCreateSpy.restore());

});
