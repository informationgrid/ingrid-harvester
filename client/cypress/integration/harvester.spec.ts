describe('Login', () => {

  beforeEach(() => {
    cy.visit('');
    cy.login('admin', 'admin');
  });

  it('should add a harvester of type EXCEL', () => {
    cy.addHarvester({
      type: 'CKAN',
      description: 'Test'
    });
  });
});
