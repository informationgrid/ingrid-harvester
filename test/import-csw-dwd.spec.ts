import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import {configure, getLogger} from "log4js";
import * as sinon from "sinon";
import {IndexDocument} from "../server/model/index-document";
import {TestUtils} from "./utils/test-utils";
import {DwdImporter} from "../server/csw/dwd-importer";

let log = getLogger();
configure('./log4js.json');

let resultFlussgebietseinheiten = require('./data/result_csw_dwd_RelativeFeuchteanRBSNStationen.json');

chai.use(chaiAsPromised);

describe('Import CSW DWD', function () {

    let indexDocumentCreateSpy;

    it('correct import of CSW-DWD data', async function () {

        log.info('Start test ...');

        const settings: any = {
            dryRun: true,
            importer: "DWD-CSW",
            elasticSearchUrl: "http://localhost:9200",
            index: "csw_dwd",
            indexType: "base",
            alias: "mcloud",
            getRecordsUrl: "https://cdc.dwd.de/catalogue/srv/en/csw",
            proxy: null,
            defaultMcloudSubgroup: "climate",
            defaultAttribution: "Climate Data Centre (CDC) Katalog des DWD",
            includeTimestamp: true
        };
        let importer = new DwdImporter(settings);
        // settings.options_csw_search.qs.constraint = '<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc"></ogc:Filter>';
        settings.options_csw_search.qs.constraint = `
            <ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">
                <ogc:PropertyIsEqualTo>
                    <ogc:PropertyName>identifier</ogc:PropertyName>
                    <ogc:Literal>de.dwd.geoserver.fach.RBSN_RH</ogc:Literal>
                </ogc:PropertyIsEqualTo>
            </ogc:Filter>`;

        sinon.stub(importer.dwdUtil.elastic, 'getIssuedDates').resolves(TestUtils.prepareIssuedDates(40, "2019-01-09T17:51:38.934Z"));

        indexDocumentCreateSpy = sinon.spy(IndexDocument, 'create');

        await importer.run();

        chai.expect(indexDocumentCreateSpy.called).to.be.true;
        let extraChecks = (actual, expected) => {
            // chai.expect(actual.extras.metadata.harvested).not.to.be.null.and.empty;
        };

        // await chai.expect(indexDocumentCreateSpy.getCall(0).returnValue).to.eventually.deep.include(resultFlussgebietseinheiten);

        await indexDocumentCreateSpy.getCall(0).returnValue.then(value => TestUtils.compareDocuments(value, resultFlussgebietseinheiten, extraChecks));

    }).timeout(10000);

    after(() => indexDocumentCreateSpy.restore())

});
