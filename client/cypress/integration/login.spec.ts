describe('LOGIN TESTS', () => {
  beforeEach(() => {
    cy.apiLogout();
  });

  it('login page is shown to begin with', () => {
    cy.visit('');
    cy.get('mat-card-title').contains('Login');
    cy.get('[data-test=login]').contains('Login');
  });

  it('crawling for pages behind the login-wall redirects to the log in page', () => {
    cy.visit('');
    //visits a page that can be only viewed after login
    cy.visit('harvester');
    //is redirected
    cy.url().should('include', 'login');
    cy.visit('config');
    cy.url().should('include', 'login');
    cy.visit('log');
    cy.url().should('include', 'login');
  });

//With GUI
  it('after successful log in, is redirected and shows the name of the user', () => {
    cy.guiLogin('admin', 'admin');
    cy.url().should('include', '/harvester');
    cy.get('data-test=logout').contains('Max Muster');
  });

  it('cannot log in (GUI) with wrong credentials', () => {
    cy.guiLogin('test', 'test');
    //checks error msg
    cy.get('.error').should('contain', 'Benutzername oder Passwort falsch');
    //keeps showing the login page
    cy.url().should('include', 'login');
  });

//Without GUI
  it('after successful log in, cookies are created, is redirected and shows the name of the user', () => {
    cy.apiLogin('admin', 'admin');

    //should have a cookie session
    cy.getCookie('connect.sid').should('exist');

    cy.url().should('include', 'harvester');
    cy.get('data-test=logout').should('contain','Max Muster');

    //why is it redirected again (sometimes)
  });

  it('cannot log in (API) with wrong credentials', () => {
    cy.apiLogin('test', 'test');
    cy.url().should('include', 'login');
  });
});
