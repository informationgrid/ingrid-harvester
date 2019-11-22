describe('Log tab operations', () => {
  let Constants = require("../support/constants");
  const constants = new Constants();

  const LogPage = require('../support/pageObjects/log');
  const logPage = new LogPage();

  beforeEach(() => {
    cy.apiLoginUserCheck();
  });

  it('should show the right information in the logs after a single harvester is imported', () => {
    cy.openAndImportHarvester(constants.CKAN_DB_ID);

    logPage.visit();
    logPage.wait(5000);
    logPage.reload();

    logPage.infoIsContained('[INFO] default - Deutsche Bahn Datenportal (CKAN)');
    logPage.infoIsContained('[INFO] default - Number of records: 42');
  });

  it('should show information in the logs when all the harvester are imported', () => {
    cy.importAll();
    logPage.visit();
    logPage.wait(5000);
    logPage.reload();
    logPage.infoIsContained('[INFO] default - >> Running importer:');
  });

});
