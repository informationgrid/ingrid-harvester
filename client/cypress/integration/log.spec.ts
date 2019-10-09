describe('LOG TAB TESTS', () => {

  beforeEach(() => {
    cy.apiLogin('admin', 'admin');
    //cy.goToLog();
  });

  it('should show information when all the harvester are imported', () => {
    //cy.goToHarvester();
    cy.importAll();
    cy.goToLog();
    cy.get('.code').contains('[INFO] default - >> Running importer:');
  });

  xit('should show information after a harvester is imported', () => {
    //opens "Deutsche Bahn Datenportal"
    cy.get('#harvester-6').click();
    cy.get('[data-test=import]:visible').click();
    cy.get('[data-test="next-execution"]').should('contain', ' wurde geändert ');

    cy.goToLog();
    cy.get('.info').should('contain', '[INFO] default - Deutsche Bahn Datenportal (CKAN)');
    cy.get('.code').should('contain', '[INFO] default - Number of records: 42');
    cy.get('.code').should('contain', '[INFO] default - Skipped records: 0');
    cy.get('.code').should('contain', '[INFO] default - Record-Errors: 0');
    cy.get('.code').should('contain', '[INFO] default - Warnings: 0');
    cy.get('.code').should('contain', '[INFO] default - App-Errors: 0');
    cy.get('.code').should('contain', '[INFO] default - Elasticsearch-Errors: 0');
  });
});
