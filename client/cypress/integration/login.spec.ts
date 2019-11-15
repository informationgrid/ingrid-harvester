describe('Login', () => {
  beforeEach(() => {
    cy.apiLogout();
  });

  it('should show the login page to begin with', () => {
    cy.visit('');
    cy.get('mat-card-title').should('contain', 'Login');
    cy.get('[data-test=login]').should('contain', 'Login');
  });

  it('should not be possible to access pages without a login', () => {
    cy.visit('');

    //visit pages that can be only viewed after login and always get redirected back to login
    cy.visit('harvester');
    cy.url().should('include', 'login');
    cy.visit('config');
    cy.url().should('include', 'login');
    cy.visit('log');
    cy.url().should('include', 'login');
  });

  //GUI
  it('should show the name of the user after a successful log in', () => {
    cy.guiLogin('admin', 'admin');
    cy.url().should('include', '/harvester');
    cy.get('.mat-button-wrapper').should('contain','Max Muster');
  });

  it('should not be able to log in (GUI) with wrong credentials', () => {
    cy.guiLogin('test', 'test');
    //checks error msg and stay on the same page
    cy.get('.error').should('contain', 'Benutzername oder Passwort falsch');
    cy.url().should('include', 'login');
  });
});
