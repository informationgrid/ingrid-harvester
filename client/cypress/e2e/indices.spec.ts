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

  it('should show only one index per harvester', () => {
    harvester.importHarvesterByIdAndWait(constants.CKAN_DB_ID);

    cy.wait(2000);
    indicesPage.visit();
    indicesPage.indexHasNoDuplicate('ckan_db');
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
