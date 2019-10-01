describe('LOGOUT TESTS', () => {

  beforeEach(() => {
    cy.apiLogin('admin', 'admin');
  });

  describe('GUI LOGOUT', () => {
    it('logs out, shows the login page and checks the log out message', () => {
      cy.guiLogout();

      cy.get('mat-card-title').should('contain','Login');
      cy.get('[data-test=login]').should('contain', 'Login');

      cy.get('.mat-simple-snackbar').should('contain', 'Sie wurden ausgeloggt');
    });
  });

  describe('API LOGOUT', () => {
    it('logs out and shows the login page', () => {
      cy.apiLogout();

      cy.get('mat-card-title').should('contain','Login');
      cy.get('[data-test=login]').should('contain', 'Login');
      //no error message is shown
    });
  });
});
