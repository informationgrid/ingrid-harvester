describe('LOGOUT TESTS', () => {

  beforeEach(() => {
    cy.apiLogin('admin', 'admin');
  });

  it('log out, show login page and check log out message', () => {
    cy.guiLogout();

    cy.get('mat-card-title').should('contain','Login');
    cy.get('[data-test=login]').should('contain', 'Login');

    cy.get('.mat-simple-snackbar').should('contain', 'Sie wurden ausgeloggt');
  });

  it('log out and show the login page', () => {
    cy.apiLogout();

    cy.get('mat-card-title').should('contain','Login');
    cy.get('[data-test=login]').should('contain', 'Login');
    //no error message is shown
  });
});
