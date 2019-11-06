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
    //ckan_db, Deutsche Bahn Datenportal always active
    //cy.get('#harvester-6 .mat-slide-toggle-bar').dblclick();
    cy.goToIndices();
    cy.get('.mat-line').invoke('text').should('contain', 'ckan_portal_hamburg');
  });

  it('should show an icon if a harvester has an import schedule', () => {
    // set schedule
    cy.openScheduleHarvester("21");
    cy.get('[placeholder="* * * * *"]').clear().type('30 4 1 * 0,6');
    cy.get('[data-test=dlg-schedule]').click();

    //check icon
    cy.get('#harvester-21 .mat-icon').should('contain', 'alarm_off');
    //activate auto planning and check the right status of the icon
    cy.get('#harvester-21 .mat-slide-toggle-bar').click({force: true});
    cy.get('#harvester-21 .mat-icon').should('contain', 'alarm_on');
    //deactivate again
    cy.get('#harvester-21 .mat-slide-toggle-bar').click({force: true});
  });
});
