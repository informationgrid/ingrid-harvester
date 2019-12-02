describe('Log tab operations', () => {
  let Constants = require("../support/constants");
  const constants = new Constants();

  const Authentication = require("../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../support/pageObjects/harvester/harvester");
  const hPage = new HarvesterPage();
  const LogPage = require('../support/pageObjects/log');
  const logPage = new LogPage();

  beforeEach(() => {
    auth.apiLoginWithUserCheck();
  });

  it('should show the right information in the logs after a single harvester is imported', () => {
    hPage.importHarvesterById(constants.CKAN_DB_ID);

    logPage.visit();
    logPage.wait(5000);
    logPage.reload();

    logPage.infoIsContained('[INFO] default - Deutsche Bahn Datenportal (CKAN)');
    logPage.infoIsContained('[INFO] default - Number of records: 42');
  });

  it('should show information in the logs when all the harvester are imported', () => {
    hPage.importAllHarvester();

    logPage.visit();
    logPage.wait(5000);
    logPage.reload();
    logPage.infoIsContained('[INFO] default - >> Running importer:');
  });

});
