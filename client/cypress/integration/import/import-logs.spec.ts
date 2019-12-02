describe('Import log operations', () => {
  let Constants = require("../../support/constants");
  const constants = new Constants();

  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../../support/pageObjects/harvester/harvester");
  const hPage = new HarvesterPage();

  beforeEach(() => {
    auth.apiLoginWithUserCheck();
  });

  it('should show errors in the error-log if error/warning occurred during an import', () => {
    hPage.importHarvesterById(constants.EXCEL_TEST_ID);
    hPage.openHarvesterLog(constants.EXCEL_TEST_ID);

    hPage.errorLogHasMsg('Error:');
    // hPage.openElasticSearchLog();
    // hPage.errorLogHasMsg('INSERT RIGHT MSG');
  });

  //TODO:
  //  Check for elastic search errors

  it('should show no error in the logs after a successful import', () => {
    hPage.importHarvesterById(constants.CKAN_RNV_ID);
    hPage.checkNoErrors(constants.CKAN_RNV_ID);
  });

  it('should show an error in the harvester logs if the CKAN index name is invalid', () => {
    hPage.importHarvesterById(constants.CKAN_TEST_ID);
    hPage.openHarvesterLog(constants.CKAN_TEST_ID);
    hPage.errorLogHasMsg('Error:');
  });

  it('should show an error in the harvester logs if the CKAN url is invalid', () => {
    hPage.importHarvesterById(constants.CKAN_TEST_ID);
    hPage.openHarvesterLog(constants.CKAN_TEST_ID);
    hPage.errorLogHasMsg('Error: Invalid URI');
  });

  it('should show an error in the harvester logs if the CSW URL is not valid ', () => {
    hPage.importHarvesterById(constants.CSW_TEST_ID);
    hPage.openHarvesterLog(constants.CSW_TEST_ID);
    hPage.errorLogHasMsg('Error: Invalid URI');
  });

  it('should show an error in the harvester logs if the Excel path is not valid', () => {
    hPage.importHarvesterById(constants.EXCEL_TEST_ID);
    hPage.openHarvesterLog(constants.EXCEL_TEST_ID);
    hPage.errorLogHasMsg('Error reading excel workbook: Error: ');
  });
});
