describe('Logout', () => {

  beforeEach(() => {
    cy.visit('');
    cy.login('admin', 'admin');
  });

  it('should be able to logout and show the login page after logout', () => {
    cy.logout();

    cy.get('mat-card-title').should('contain','Login');
    cy.get('[data-test=login]').should('contain', 'Login');

    cy.get('.mat-simple-snackbar').should('contain', 'Sie wurden ausgeloggt');
  });
});
