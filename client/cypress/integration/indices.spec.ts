describe('Indices operations', () => {
  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      //user is not already logged in send request to log in
      cy.apiLogin('admin', 'admin');
    }
  });

  it('should click the slide toggle bar', () => {
    //conditional testing
    cy.get('#harvester-9 .mat-slide-toggle-bar').dblclick();
    cy.get('#harvester-9 .mat-slide-toggle-input').should('be.checked');
  });

  it('should not find an harvester whose search is not activated', () => {
    // ckan_db Deutsche Bahn Datenportal
    cy.get('#harvester-9 .mat-slide-toggle-bar').dblclick();
    cy.goToIndices();
    cy.reload();
    cy.get('.mat-line').invoke('text').should('not.contain', 'ckan_portal_hamburg');
  })

});
