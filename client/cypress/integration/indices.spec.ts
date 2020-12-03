import Authentication from "../support/pageObjects/auth";
import Constants from "../support/constants";
import HarvesterPage from "../support/pageObjects/harvester/harvester";
import IndicesPage from "../support/pageObjects/indices";

describe('Indices operations', () => {
  const constants = new Constants();
  const auth = new Authentication();
  const harvester = new HarvesterPage();
  const indicesPage = new IndicesPage();

  beforeEach(() => {
    auth.apiLogIn();
  });

  it('should not find a harvester whose search is not activated', () => {
    harvester.activateForSearch(constants.CSW_CODEDE_ID);

    indicesPage.visit();
    indicesPage.indexIsContained(constants.CSW_CODEDE_INDEX, false);
  });

  it('should find a harvester whose search is activated', () => {
    harvester.activateForSearch(constants.CKAN_DB_ID);
    harvester.importHarvesterById(constants.CKAN_DB_ID);

    indicesPage.visit();
    indicesPage.indexIsContained('ckan_db', true);
  });

  it('should show only one index per harvester', () => {
    harvester.importHarvesterByIdAndWait(constants.CKAN_DB_ID);

    cy.wait(2000);
    indicesPage.visit();
    indicesPage.indexHasNoDuplicate('ckan_db');
  });

  it('should delete an index if its harvester is deleted', () => {
    harvester.seedExcelHarvester(constants.SEED_EXCEL_ID);
    harvester.importHarvesterByIdAndWait(constants.SEED_EXCEL_ID);

    indicesPage.visit();
    indicesPage.indexIsContained('excel_index_api', true);

    harvester.visit();
    harvester.deleteHarvesterById(constants.SEED_EXCEL_ID);

    indicesPage.visit();
    indicesPage.indexIsContained('excel_index_api', false);
  });

  it('should show the content of an index when it is clicked', () => {
    let dbIndexContent = "{\n" +
      "    \"_index\": \"ckan_db_";
    let indexType = "\"_type\": \"base\"";

    harvester.importHarvesterByIdAndWait(constants.CKAN_DB_ID);

    indicesPage.visit();

    indicesPage.selectIndex('ckan_db');
    indicesPage.checkContentIs(dbIndexContent);
    indicesPage.checkContentIs(indexType);
  });
});
