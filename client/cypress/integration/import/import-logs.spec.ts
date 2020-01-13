describe('Import log operations', () => {
  let Constants = require("../../support/constants");
  const constants = new Constants();

  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../../support/pageObjects/harvester/harvester");
  const harvester = new HarvesterPage();

  before(()=>{
    auth.apiLogIn();
  });

  beforeEach(() => {
    cy.reload();
    cy.restoreLocalStorageCache();
    Cypress.Cookies.preserveOnce('connect.sid');
  });

  afterEach(() => {
    cy.saveLocalStorageCache();
  });

  it('should show errors in the error-log if error/warning occurred during an import', () => {
    harvester.importHarvesterById(constants.EXCEL_TEST_ID);
    harvester.openHarvesterLog(constants.EXCEL_TEST_ID);

    harvester.errorLogHasMsg('Error:');
    // hPage.openElasticSearchLog();
    // hPage.errorLogHasMsg('INSERT RIGHT MSG');
  });

  //TODO:
  //  Check for elastic search errors

  it('should show no error in the logs after a successful import', () => {
    harvester.importHarvesterById(constants.CKAN_RNV_ID);
    harvester.checkNoErrors(constants.CKAN_RNV_ID);
  });

  it('should show an error in the harvester logs if the CKAN index name is invalid', () => {
    harvester.importHarvesterById(constants.CKAN_TEST_ID);
    harvester.openHarvesterLog(constants.CKAN_TEST_ID);
    harvester.errorLogHasMsg('Error:');
  });

  it('should show an error in the harvester logs if the CKAN url is invalid', () => {
    harvester.importHarvesterById(constants.CKAN_TEST_ID);
    harvester.openHarvesterLog(constants.CKAN_TEST_ID);
    harvester.errorLogHasMsg('Error: Invalid URI');
  });

  it('should show an error in the harvester logs if the CSW URL is not valid ', () => {
    harvester.importHarvesterById(constants.CSW_TEST_ID);
    harvester.openHarvesterLog(constants.CSW_TEST_ID);
    harvester.errorLogHasMsg('Error: Invalid URI');
  });

  it('should show an error in the harvester logs if the Excel path is not valid', () => {
    harvester.importHarvesterById(constants.EXCEL_TEST_ID);
    harvester.openHarvesterLog(constants.EXCEL_TEST_ID);
    harvester.errorLogHasMsg('Error reading excel workbook: Error: ');
  });
});
