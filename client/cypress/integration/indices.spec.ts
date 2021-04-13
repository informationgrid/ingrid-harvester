import Authentication from '../support/pageObjects/auth';
import Constants from '../support/constants';
import HarvesterPage from '../support/pageObjects/harvester/harvester';
import IndicesPage from '../support/pageObjects/indices';

describe('Indices operations', () => {
  const constants = new Constants();
  const auth = new Authentication();
  const harvester = new HarvesterPage();
  const indicesPage = new IndicesPage();

  beforeEach(() => {
    auth.apiLogIn();
  });

  it('should not find a harvester whose search is not activated', () => {
    harvester.deactivateForSearch(constants.CSW_DFS_ID);
    indicesPage.visit();
    indicesPage.indexIsContained(constants.CSW_DFS_INDEX, false);
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
    const dbIndexContent = '{\n' +
      '    "_index": "ckan_geonet_mrn_';
    const indexType = '"_type": "base"';

    harvester.importHarvesterByIdAndWait(constants.CKAN_GEONET_ID);

    indicesPage.visit();

    indicesPage.selectIndex('ckan_geonet_mrn');
    indicesPage.checkContentIs(dbIndexContent);
    indicesPage.checkContentIs(indexType);
  });
});
