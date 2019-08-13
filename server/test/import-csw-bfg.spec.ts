import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import {configure, getLogger} from "log4js";
import * as sinon from "sinon";
import {TestUtils} from "./utils/test-utils";
import {IndexDocument} from '../app/model/index.document';
import {BfgImporter} from '../app/importer/csw/bfg.importer';
import {CswSettings} from '../app/importer/csw/csw.settings';

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
            getRecordsUrl: "https://geoportal.bafg.de/soapServices/CSWStartup",
            proxy: null,
            defaultMcloudSubgroup: ["waters"],
            defaultDCATCategory: ["TRAN"],
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

        sinon.stub(importer.elastic, 'getIssuedDates').resolves(TestUtils.prepareIssuedDates(40, "2019-01-09T17:51:38.934Z"));

        indexDocumentCreateSpy = sinon.spy(IndexDocument, 'create');

        importer.run.subscribe({
            complete: async () => {
                chai.expect(indexDocumentCreateSpy.called).to.be.true;
                let extraChecks = (actual, expected) => {
                    // chai.expect(actual.extras.metadata.harvested).not.to.be.null.and.empty;
                };

                // await chai.expect(indexDocumentCreateSpy.getCall(0).returnValue).to.eventually.deep.include(resultFlussgebietseinheiten);

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
