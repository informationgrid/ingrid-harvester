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
    harvester.seedCswHarvester(constants.SEED_CSW_ID);
    harvester.importHarvesterById(constants.SEED_CSW_ID);
    harvester.waitForImportToFinish(constants.SEED_CSW_ID);

    indicesPage.visit();
    indicesPage.indexIsContained('csw_index', true);

    harvester.visit();
    harvester.deleteHarvesterById(constants.SEED_CSW_ID);

    indicesPage.visit();
    indicesPage.indexIsContained('csw_index', false);
  });

  it('should show the content of an index when it is clicked', () => {
    let dbIndexContent = "{\n" +
      "    \"_index\": \"ckan_db_";
    let indexDescription = "\"description\": " +
      "\"Die hier gelieferten Daten stellen die Anzahl der Zugfahrten und Verspätungsminuten pro Tag und Betriebsstelle dar. " +
      "Berücksichtigt wurden alle Bst, über die mindestens 10 Zugfahrten stattfanden.\"";

    harvester.importHarvesterById(constants.CKAN_DB_ID);
    harvester.waitForImportToFinish(constants.CKAN_DB_ID);

    indicesPage.visit();

    indicesPage.selectIndex('ckan_db');
    indicesPage.checkContentIs(dbIndexContent);
    indicesPage.checkContentIs(indexDescription);
  })
});
