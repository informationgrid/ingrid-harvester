describe('Log tab operations', () => {

  beforeEach(() => {
    cy.apiLogin('admin', 'admin');
  });

  it('should show information in the logs when all the harvester are imported', () => {
    cy.importAll();
    cy.goToLog();
    cy.reload();
    cy.wait(500);
    cy.get('.code').contains('[INFO] default - >> Running importer:');
  });

  it('should show the right information in the logs after a single harvester is imported', () => {
    //opens "Deutsche Bahn Datenportal"
    cy.openAndImportHarvester("6");

    cy.get('#harvester-6').scrollIntoView();
    cy.get('#harvester-6 [data-test="next-execution"]', {timeout: 30000}).should('contain', ' wurde geändert ');

    cy.goToLog();
    cy.reload();
    cy.get('.info').should('contain', '[INFO] default - Deutsche Bahn Datenportal (CKAN)');
    cy.get('.code').should('contain', '[INFO] default - Number of records: 42');

  });
});
