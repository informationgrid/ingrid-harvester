describe('Log tab operations', () => {
  let Constants = require("../support/constants");
  const constants = new Constants();

  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      cy.apiLogin('admin', 'admin');
    }
  });

  it('should show the right information in the logs after a single harvester is imported', () => {
    cy.openAndImportHarvester(constants.CKAN_DB_ID);

    cy.goToLog();
    cy.wait(3000);
    cy.reload();
    cy.get('.info').should('contain', '[INFO] default - Deutsche Bahn Datenportal (CKAN)');
    cy.get('.info').should('contain', '[INFO] default - Number of records: 42');
  });

  it('should show information in the logs when all the harvester are imported', () => {
    cy.importAll();
    cy.goToLog();
    cy.wait(7000);
    cy.reload();
    cy.get('.info').contains('[INFO] default - >> Running importer:');
  });

});
