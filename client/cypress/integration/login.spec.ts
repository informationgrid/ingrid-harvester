describe('Login test', () => {
  beforeEach(() => {
    cy.apiLogout();
  });

  it('login page is shown to begin with', () => {
    cy.visit('');
    cy.get('mat-card-title').contains('Login');
    cy.get('[data-test=login]').contains('Login');
  });

  //tests using the gui
  describe('GUI Login', () => {
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
  describe('API Login', () => {
    it('logs in, cookies are created, is redirected and shows the name of the user', () => {
      cy.apiLogin('admin', 'admin');

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

describe('Tests without a login', () => {
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
