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
    //visit pages that can be only viewed after login
    cy.visit('harvester');
    //is redirected
    cy.url().should('include', 'login');
    cy.visit('config');
    cy.url().should('include', 'login');
    cy.visit('log');
    cy.url().should('include', 'login');
  });

//With GUI
  it('should show the name of the user after a successful log in', () => {
    cy.guiLogin('admin', 'admin');
    cy.url().should('include', '/harvester');
    //cy.get('data-test="logout"').contains('Max Muster');
    cy.get('.mat-button-wrapper').should('contain','Max Muster');
  });

  it('should not be able to log in (GUI) with wrong credentials', () => {
    cy.guiLogin('test', 'test');
    //checks error msg
    cy.get('.error').should('contain', 'Benutzername oder Passwort falsch');
    //keeps showing the login page
    cy.url().should('include', 'login');
  });

//Without GUI
  xit('should create cookies and show the name of the user after successful log in', () => {
    cy.getCookie('connect.sid').should('not.exist');
    cy.apiLogin();
    //should have a cookie session
    cy.getCookie('connect.sid').should('exist');
    cy.url().should('include', 'harvester');
    //cy.get('data-test="logout"').should('contain','Max Muster');
    cy.get('.mat-button-wrapper').should('contain','Max Muster');
  });

  xit('should not be able to log in (API) with wrong credentials', () => {
    cy.apiLogin('test', 'test');
    cy.url().should('include', 'login');
  });
});
