describe('Logout', () => {
  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      cy.apiLogin('admin', 'admin');
    }
    cy.url().should('include', '/harvester');
  });

  it('should log out successfully, show the login page and check the log out message', () => {
    cy.guiLogout();

    cy.get('.mat-simple-snackbar').should('contain', 'Sie wurden ausgeloggt');
    cy.get('mat-card-title').should('contain','Login');
    cy.get('[data-test=login]').should('contain', 'Login');
  });

  it('should log out successfully and show the login page', () => {
    cy.apiLogout();

    cy.get('mat-card-title').should('contain','Login');
    cy.get('[data-test=login]').should('contain', 'Login');
  });
});
