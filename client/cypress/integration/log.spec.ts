describe('Log tab operations', () => {
  let Constants = require("../support/constants");
  const constants = new Constants();

  const Authentication = require("../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../support/pageObjects/harvester/harvester");
  const harvester = new HarvesterPage();
  const LogPage = require('../support/pageObjects/log');
  const logPage = new LogPage();

  beforeEach(() => {
    auth.apiLoginWithUserCheck();
  });

  it('should show the right information in the logs after a single harvester is imported', () => {
    harvester.importHarvesterById(constants.CKAN_DB_ID);
    cy.wait(2500);

    logPage.visit();
    logPage.infoIsContained('[INFO] default - Deutsche Bahn Datenportal (CKAN)');
    logPage.infoIsContained('[INFO] default - Number of records: 42');
  });

  xit('should show information in the logs when all the harvester are imported', () => {
    //wait a bit for log status to be cleaner
    cy.wait(10000);

    harvester.importAllHarvesters();

    logPage.visit();
    cy.wait(5000);
    cy.reload();
    logPage.infoIsContained('[INFO] default - >> Running importer:');
  });

});
