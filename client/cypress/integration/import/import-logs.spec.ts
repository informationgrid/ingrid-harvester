describe('Import log operations', () => {
  let Constants = require("../../support/constants");
  const constants = new Constants();

  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../../support/pageObjects/harvester/harvester");
  const harvester = new HarvesterPage();

  beforeEach(() => {
    auth.apiLogIn();
  });

  it('should show errors in the error-log if error/warning occurred during an import', () => {
    harvester.importHarvesterById(constants.EXCEL_TEST_ID);
    harvester.openHarvesterLog(constants.EXCEL_TEST_ID);

    harvester.errorLogHasMsg('Error reading excel workbook: ');
  });

  it('should show no error in the logs after a successful import', () => {
    harvester.importHarvesterById(constants.CKAN_DB_ID);
    harvester.waitForImportToFinish(constants.CKAN_DB_ID);
    harvester.checkNoErrors(constants.CKAN_DB_ID);
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
    harvester.seedCswHarvester(constants.SEED_CSW_ID);
    harvester.importHarvesterById(constants.SEED_CSW_ID);
    harvester.openHarvesterLog(constants.SEED_CSW_ID);
    harvester.errorLogHasMsg('Error: Invalid URI');
    harvester.closeErrorLog();
    harvester.deleteHarvesterById(constants.SEED_CSW_ID);
  });

  it('should show an error in the harvester logs if the Excel path is not valid', () => {
    harvester.importHarvesterById(constants.EXCEL_TEST_ID);
    harvester.openHarvesterLog(constants.EXCEL_TEST_ID);
    harvester.errorLogHasMsg('Error reading excel workbook: Error');
  });
});
