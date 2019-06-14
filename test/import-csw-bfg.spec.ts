import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import {configure, getLogger} from "log4js";
import * as sinon from "sinon";
import {IndexDocument} from "../server/model/index.document";
import {TestUtils} from "./utils/test-utils";
import {BfgImporter} from "../server/importer/csw/bfg.importer";
import {CswSettings} from "../server/importer/csw/csw.importer";

let log = getLogger();
configure('./log4js.json');

let resultFlussgebietseinheiten = require('./data/result_csw_bfg_Flussgebietseinheiten.json');

chai.use(chaiAsPromised);

describe('Import CSW BFG', function () {

    let indexDocumentCreateSpy;

    it('correct import of CSW-BFG data', async function () {

        log.info('Start test ...');

        // @ts-ignore
        const settings: CswSettings = {
            dryRun: true,
            getRecordsUrl: "https://geoportal.bafg.de/soapServices/CSWStartup",
            proxy: null,
            defaultMcloudSubgroup: "waters",
            defaultDCATCategory: "TRAN",
            defaultAttribution: "Bundesanstalt für Gewässerkunde",
            defaultAttributionLink: "https://www.bafg.de/",
            includeTimestamp: true,
            recordFilter: `
                <ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>subject</ogc:PropertyName>
                        <ogc:Literal>opendata</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>identifier</ogc:PropertyName>
                        <ogc:Literal>82f97ad0-198b-477e-a440-82fa781624eb</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                </ogc:Filter>`
        };

        let importer = new BfgImporter(settings);

        sinon.stub(importer.bfgUtil.elastic, 'getIssuedDates').resolves(TestUtils.prepareIssuedDates(40, "2019-01-09T17:51:38.934Z"));

        indexDocumentCreateSpy = sinon.spy(IndexDocument, 'create');

        await importer.bfgUtil.run();

        chai.expect(indexDocumentCreateSpy.called).to.be.true;
        let extraChecks = (actual, expected) => {
            // chai.expect(actual.extras.metadata.harvested).not.to.be.null.and.empty;
        };

        // await chai.expect(indexDocumentCreateSpy.getCall(0).returnValue).to.eventually.deep.include(resultFlussgebietseinheiten);

        await indexDocumentCreateSpy.getCall(0).returnValue.then(value => TestUtils.compareDocuments(value, resultFlussgebietseinheiten, extraChecks));

    }).timeout(10000);

    after(() => indexDocumentCreateSpy.restore())

});
