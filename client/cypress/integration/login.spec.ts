describe('Login', () => {

  beforeEach(() => {
    cy.visit('');
  });

  // https://on.cypress.io/interacting-with-elements

  it('should show the login page', () => {
    cy.get('mat-card-title').contains('Login');
    cy.get('[data-test=login]').contains('Login');
  });

  it('should be able to login', () => {
    cy.login('admin', 'admin');
    cy.url().should('include', '/harvester');
    cy.get('mat-toolbar button').contains('Max Muster');
  });
});
