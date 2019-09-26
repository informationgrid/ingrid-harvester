describe('Log', () => {

  beforeEach(() => {
    cy.visit('');
    cy.login('admin', 'admin');
    //cy.goToLog();
  });

  it('should show information when all the harvester are imported', () => {
    //cy.goToHarvester();
    cy.importAll();
    cy.goToLog();
    cy.get('.code').contains('[INFO] default - >> Running importer:');
  });
});
