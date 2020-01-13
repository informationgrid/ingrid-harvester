describe('Indices operations', () => {
  let Constants = require("../support/constants");
  const constants = new Constants();

  const Authentication = require("../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../support/pageObjects/harvester/harvester");
  const harvester = new HarvesterPage();
  const IndicesPage = require('../support/pageObjects/indices');
  const indicesPage = new IndicesPage();

  beforeEach(() => {
    auth.apiLogIn();
  });

  it('should not find an harvester whose search is not activated', () => {
    harvester.activateForSearch(constants.EXCEL_TEST_ID);

    indicesPage.visit();
    indicesPage.indexIsContained('excel_index', false);
  });

  it('should find an harvester whose search is activated', () => {
    harvester.activateForSearch(constants.CKAN_DB_ID);
    harvester.importHarvesterById(constants.CKAN_DB_ID);

    indicesPage.visit();
    indicesPage.indexIsContained('ckan_db', true);
  });

  it('should show only one index per harvester', () => {
    harvester.importHarvesterById(constants.CKAN_DB_ID);
    harvester.waitForImportToFinish(constants.CKAN_DB_ID);

    indicesPage.visit();
    indicesPage.indexHasNoDuplicate('ckan_db');
  });

  it('should delete an index if its harvester is deleted', () => {
    harvester.importHarvesterById(constants.CSW_TEST_ID);
    harvester.waitForImportToFinish(constants.CSW_TEST_ID);

    indicesPage.visit();
    indicesPage.indexIsContained('csw_index', true);

    harvester.visit();
    harvester.deleteHarvesterById(constants.CSW_TEST_ID);

    indicesPage.visit();
    indicesPage.indexIsContained('csw_index', false);
  });

  it('should show the content of an index when it is clicked', () => {
    let dbIndexContent = "\"_type\": \"base\",\n" +
      "    \"_id\": \"7e526b8c-16bd-4f2c-a02b-8d4d0a29d310\",\n" +
      "    \"_score\": 1,\n" +
      "    \"_source\": {\n" +
      "      \"accrualPeriodicity\": \"once_per_year\",\n" +
      "      \"creator\": {\n" +
      "        \"name\": \"Hannah Richta\",\n" +
      "        \"mbox\": \"hannah.richta@deutschebahn.com\"\n" +
      "      },\n" +
      "      \"description\": ";

    harvester.importHarvesterById(constants.CKAN_DB_ID);
    harvester.waitForImportToFinish(constants.CKAN_DB_ID);

    indicesPage.visit();

    indicesPage.selectIndex('ckan_db');
    indicesPage.checkContentIs(dbIndexContent);
  })
});
