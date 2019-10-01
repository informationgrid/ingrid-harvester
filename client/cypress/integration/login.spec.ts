describe('LOGIN TESTS', () => {
  beforeEach(() => {
    cy.apiLogout();
  });

  describe('TESTS WITHOUT LOGIN', () => {
    it('login page is shown to begin with', () => {
      cy.visit('');
      cy.get('mat-card-title').contains('Login');
      cy.get('[data-test=login]').contains('Login');
    });

    it('is redirected to login page when crawling for pages behind login', () => {
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
  });

  //tests using the gui
  describe('GUI LOGIN', () => {
    it('logs in, is redirected and shows the name of the user', () => {
      cy.guiLogin('admin', 'admin');
      cy.url().should('include', '/harvester');
      cy.get('mat-toolbar button').contains('Max Muster');
    });

    it('cannot log in with wrong credentials', () => {
      cy.guiLogin('test', 'test');
      //checks error msg
      cy.get('.error').should('contain', 'Benutzername oder Passwort falsch');
      //keeps showing the login page
      cy.url().should('include', 'login');
    });
  });

  //Without GUI - working but there are no side buttons or tabs
  describe('API LOGIN', () => {
    it.only('logs in, cookies are created, is redirected and shows the name of the user', () => {
      cy.apiLogin('admin', 'admin');

      //should have a cookie session
      cy.getCookie('connect.sid').should('exist');

      cy.url().should('include', 'harvester');
      cy.get('mat-toolbar button').should('contain','Max Muster');

      //TODO why is it redirected again
    });

    it('cannot log in with wrong credentials', () => {
      cy.apiLogin('test', 'test');
      cy.url().should('include', 'login');
    });
  });
});

