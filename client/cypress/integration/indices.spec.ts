describe('Indices operations', () => {
  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      cy.apiLogin('admin', 'admin');
    }
  });

  it('should be able to click the slide toggle bar and check the right icon is shown if scheduling is on', () => {
    // create a schedule for harvester
    cy.openScheduleHarvester("3");
    cy.get('[data-test="cron-input"]').clear().type('30 4 1 * 0,6');
    cy.get('[data-test=dlg-schedule]').click();

    cy.deactivateToggleBar('3');
    cy.get('#harvester-3 .mat-icon').should('contain', 'alarm_off');

    cy.activateToggleBar('3');
    cy.get('#harvester-3 .mat-icon').should('contain', 'alarm_on');
  });

  it('should not find an harvester whose search is not activated', () => {
    //if search is on, turn it off
    cy.deactivateToggleBar('3');

    cy.reload();
    cy.goToIndices();
    cy.get('.mat-line').invoke('text').should('not.contain', 'ckan_index');
  });

  it('should find an harvester whose search is activated', () => {
    cy.activateToggleBar('6');
    cy.openAndImportHarvester('6');

    cy.goToIndices();
    cy.wait(500);
    cy.get('.mat-line').invoke('text').should('contain', 'ckan_db');
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
      //remove index of given harvester
      const partialIndex = allIndex.text().replace('ckan_db', '');
      //index of the harvester should not be in the modified list of indices, unless it is present two times
      expect(partialIndex).not.contain('ckan_db');
      });
  });

  xit('should delete an index if its harvester is deleted', () => {
  //  TODO: is it supposed to be like this ?
  });
});
