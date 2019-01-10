import {ElasticSearchUtils} from "../server/utils/elastic-utils";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import {configure, getLogger} from "log4js";
import {DeutscheBahnCkanImporter} from "../server/ckan/importer";
import * as sinon from "sinon";
import {IndexDocument} from "../server/model/index-document";
import {TestUtils} from "./utils/test-utils";

let log = getLogger();
configure('server/log4js.json');

let resultZugbildungsplan = require('./data/result_ckan_bahn_Zugbildungsplan.json');

chai.use(chaiAsPromised);

describe( 'Import CKAN Bahn', function () {

  it( 'correct import of CKAN data', async function () {

    log.info('Start test ...');

    var settings = {
      dryRun: true,
      ckanBaseUrl: "https://data.deutschebahn.com",
      defaultMcloudSubgroup: "railway",
      includeTimestamp: true
    };
    let importer = new DeutscheBahnCkanImporter(settings);

    sinon.stub(importer.elastic, 'getIssuedDates').resolves(TestUtils.prepareIssuedDates(40, "2019-01-09T17:51:38.934Z"));

    let indexDocumentCreateSpy = sinon.spy(IndexDocument, 'create');

    await importer.run();

    chai.expect(indexDocumentCreateSpy.called).to.be.true;
    let extraChecks = (actual, expected) => {
      chai.expect(actual.extras.metadata.harvested).not.to.be.null.and.empty;
    };

    await indexDocumentCreateSpy.getCall(0).returnValue.then( value => TestUtils.compareDocuments(value, resultZugbildungsplan, extraChecks) );

  } ).timeout(10000)

} );
