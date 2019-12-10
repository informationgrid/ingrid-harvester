describe('Indices operations', () => {
  let Constants = require("../support/constants");
  const constants = new Constants();

  const Authentication = require("../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../support/pageObjects/harvester/harvester");
  const hPage = new HarvesterPage();
  const IndicesPage = require('../support/pageObjects/indices');
  const indicesPage = new IndicesPage();

  beforeEach(() => {
    auth.apiLoginWithUserCheck();
  });

  it('should not find an harvester whose search is not activated', () => {
    hPage.activateForSearch(constants.EXCEL_TEST_ID);

    indicesPage.visit();
    indicesPage.reload();

    indicesPage.indexIsContained('excel_index', false);
  });

  it('should find an harvester whose search is activated', () => {
    hPage.activateForSearch(constants.CKAN_DB_ID);
    hPage.importHarvesterById(constants.CKAN_DB_ID);

    indicesPage.visit();
    indicesPage.wait(500);

    indicesPage.indexIsContained('ckan_db', true);
  });

  it('should show only one index per harvester', () => {
    hPage.importHarvesterById(constants.CKAN_DB_ID);
    hPage.wait(5000); //wait for import to finish

    indicesPage.visit();
    indicesPage.indexHasNoDuplicate('ckan_db');
  });

  it('should delete an index if its harvester is deleted', () => {
    hPage.importHarvesterById(constants.CSW_TEST_ID);

    indicesPage.visit();
    indicesPage.wait(500);
    indicesPage.reload();
    indicesPage.indexIsContained('csw_index', true);

    hPage.visit();
    hPage.deleteHarvesterById(constants.CSW_TEST_ID);

    indicesPage.visit();
    indicesPage.wait(500);
    indicesPage.reload();
    indicesPage.indexIsContained('csw_index', false);
  });
});
