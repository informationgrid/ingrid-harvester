describe('Indices operations', () => {
  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      //user is not already logged in send request to log in
      cy.apiLogin('admin', 'admin');
    }
  });

  it('should be able to click the slide toggle bar', () => {
    //conditional testing
    cy.deactivateToggleBar('19');
    cy.get('#harvester-19 .mat-icon').should('contain', 'alarm_off');

    cy.activateToggleBar('19');
    cy.get('#harvester-19 .mat-icon').should('contain', 'alarm_on');
  });

  it('should not find an harvester whose search is not activated', () => {
    //if search is on turn it off
    cy.deactivateToggleBar('3');

    cy.reload();
    cy.goToIndices();
    cy.get('.mat-line').invoke('text').should('not.contain', 'ckan_index');
  });

  it('should find an harvester whose search is activated', () => {
    // cy.get('#harvester-6 .mat-slide-toggle-bar').click({force: true});
    cy.openAndImportHarvester('6');
    // cy.wait(5000);
    cy.goToIndices();
    cy.wait(500);
    cy.get('.mat-line').invoke('text').should('contain', 'ckan_test');
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

  it('should show only one index per harvester', () => {
    cy.openAndImportHarvester('6');
    cy.goToIndices();
    cy.wait(500);

    cy.get('.mat-line').then((allIndex) => {
      const partialIndex = allIndex.text().replace('ckan_db', '');
      expect(partialIndex).not.contain('ckan_db');
      });
  });

  xit('should delete an index if its harvester is deleted', () => {
  });
});
