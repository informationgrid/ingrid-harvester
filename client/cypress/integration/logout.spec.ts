describe('Logout', () => {

  beforeEach(() => {
    cy.visit('');
    cy.login('admin', 'admin');
  });

  it('should be able to logout and show the login page after logout', () => {
    cy.logout();

    cy.get('mat-card-title').contains('Login');
    cy.get('[data-test=login]').contains('Login');

    cy.get('.mat-simple-snackbar').contains('Sie wurden ausgeloggt');
  });
});
