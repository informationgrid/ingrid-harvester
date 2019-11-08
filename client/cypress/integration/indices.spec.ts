describe('Indices operations', () => {
  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      //user is not already logged in send request to log in
      cy.apiLogin('admin', 'admin');
    }
  });

  it('should click the slide toggle bar', () => {
    //conditional testing
    cy.get('#harvester-9 .mat-slide-toggle-bar').click({force: true});
    cy.get('#harvester-9 .mat-slide-toggle-input').should('be.checked');

    //turn off again
    cy.get('#harvester-9 .mat-slide-toggle-bar').click({force: true});
  });

  it('should not find an harvester whose search is not activated', () => {
    cy.get('#harvester-9 .mat-slide-toggle-bar').click({force: true});
    cy.goToIndices();
    cy.reload();
    cy.get('.mat-line').invoke('text').should('not.contain', 'ckan_portal_hamburg');
  });

  it('should find an harvester whose search is activated', () => {
    //cy.get('#harvester-6 .mat-slide-toggle-bar').dblclick();
    cy.goToIndices();
    cy.wait(500);
    cy.get('.mat-line').invoke('text').should('contain', 'ckan_portal_hamburg');
  });

  //harvester index must be clearer
  xit('should not show indices of a deleted harvester', () => {
    cy.openAndImportHarvester('36');
    cy.goToIndices();
    cy.wait(500);
    cy.get('.mat-line').invoke('text').should('contain', 'testing_excel_index');

    cy.goToHarvester();
    cy.openHarvester('36');
    cy.get('#harvester-36 [data-test="delete"]').click();
    cy.get('.mat-button-wrapper').contains('Löschen').click();
    cy.get('.mat-button-wrapper').contains('Abbrechen').click();
    cy.wait(1000);

    cy.goToIndices();
    cy.wait(500);
    cy.get('.mat-line').invoke('text').should('not.contain', 'testing_excel_indice');
  });

  xit('should show only one index per harvester', () =>{
  });

  xit('should delete an index if its harvester is deleted', () =>{
  });
});
