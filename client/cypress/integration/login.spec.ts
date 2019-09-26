describe('Login', () => {

  beforeEach(() => {
    cy.visit('');
  });

  //TODO login wihtout GUI <- cy.task() https://github.com/cypress-io/cypress-example-recipes/blob/master/examples/logging-in__single-sign-on/cypress/integration/logging-in-single-sign-on-spec.js

  // https://on.cypress.io/interacting-with-elements

  xit('should be able to log in without using the gui', () => {
    cy.fastLogin('admin', 'admin');
    cy.url().should('include', '/harvester');
    cy.get('mat-toolbar button').contains('Max Muster');
  });

  it('should show the login page', () => {
    cy.get('mat-card-title').contains('Login');
    cy.get('[data-test=login]').contains('Login');
  });

  it('should be able to login', () => {
    cy.login('admin', 'admin');
    cy.url().should('include', '/harvester');
    cy.get('mat-toolbar button').contains('Max Muster');
  });

  it('should not be able to login with a wrong user', () => {
    cy.login('test', 'test');

    //keeps showing the login page
    cy.get('mat-card-title').contains('Login');
    cy.get('.mat-button').contains('Login');
    //checks error msg
    cy.get('.error').contains('Benutzername oder Passwort falsch');
  })
});
