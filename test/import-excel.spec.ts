import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";
import {ExcelImporter, ExcelSettings} from "../server/excel/excel.importer";
import {configure, getLogger} from "log4js";
import {IndexDocument} from "../server/model/index.document";
import {TestUtils} from "./utils/test-utils";

let log = getLogger();
configure('./log4js.json');

let resultMauttabelle = require('./data/result_excel_mauttabelle.json');
let resultBathymetrien = require('./data/result_excel_bathymetrien.json');
let resultBadegewaesser = require('./data/result_excel_badegewaesser.json');

chai.use(chaiAsPromised);

describe('Import Excel', function () {

    let indexDocumentCreateSpy;

    it('correct import of Excel file', async function () {

        log.info('Start test ...');

        var settings: ExcelSettings = {
            dryRun: true,
            filePath: 'test/data/data-test.xlsx',
            defaultDCATCategory: 'DEFAULT_TRAN',
            alias: undefined,
            elasticSearchUrl: undefined,
            importer: undefined,
            includeTimestamp: undefined,
            index: undefined
        };
        let importer = new ExcelImporter(settings);

        sinon.stub(importer.elastic, 'getIssuedDates').resolves(TestUtils.prepareIssuedDates(3, "2019-01-08T16:33:11.168Z"));

        indexDocumentCreateSpy = sinon.spy(IndexDocument, 'create');

        await importer.run();

        chai.expect(indexDocumentCreateSpy.calledThrice).to.be.true;
        await indexDocumentCreateSpy.getCall(0).returnValue.then(value => TestUtils.compareDocuments(value, resultMauttabelle));
        await indexDocumentCreateSpy.getCall(1).returnValue.then(value => TestUtils.compareDocuments(value, resultBathymetrien));
        await indexDocumentCreateSpy.getCall(2).returnValue.then(value => TestUtils.compareDocuments(value, resultBadegewaesser));

    }).timeout(10000);

    after(() => indexDocumentCreateSpy.restore());

});
