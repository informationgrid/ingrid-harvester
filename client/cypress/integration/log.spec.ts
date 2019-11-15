describe('Log tab operations', () => {
  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      cy.apiLogin('admin', 'admin');
    }
  });

  it('should show the right information in the logs after a single harvester is imported', () => {
    //opens "Deutsche Bahn Datenportal"
    cy.openAndImportHarvester("6");

    cy.goToLog();
    cy.reload();
    cy.get('.info').should('contain', '[INFO] default - Deutsche Bahn Datenportal (CKAN)');
    cy.get('.code').should('contain', '[INFO] default - Number of records: 42');
  });

  it('should show information in the logs when all the harvester are imported', () => {
    cy.importAll();
    cy.reload();
    cy.goToLog();
    cy.get('.code', {timeout: 3000}).contains('[INFO] default - >> Running importer:');
  });

});
