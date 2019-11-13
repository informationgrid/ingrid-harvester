describe('Import operations', () => {
  beforeEach(() => {
    if (!(window.localStorage.getItem('currentUser'))) {
      cy.apiLogin('admin', 'admin');
    }
  });

  it('should open a harvester, start an import and check it is successful', () => {
    cy.openAndImportHarvester("6");

    cy.get('.mat-simple-snackbar').should('contain', 'Import gestartet');
    cy.get('app-importer-detail').should('contain', ' Import läuft ');
    cy.wait(3000);
    cy.reload();

    const importsDate = Cypress.moment().format('DD.MM.YY, HH:mm');
    cy.get('#harvester-6').click();
    cy.get('#harvester-6 [data-test=last-execution]').should('contain', importsDate)
  });

  it('should import all harvesters at once and check a message is shown', () => {
    cy.importAll();
    cy.get('.mat-simple-snackbar').should('contain', 'Import von allen Harvestern gestartet');
  });

  it('should show last import info of an harvester after page refresh', () => {
    // Deutsche Bahn Datenportal
    cy.openAndImportHarvester("6");

    cy.get('.mat-simple-snackbar').should('contain', 'Import gestartet');
    cy.get('app-importer-detail').should('contain', ' Import läuft ');

    //antipattern
    cy.wait(5000);
    cy.reload();
    //check today's date und hour
    const importsDate = Cypress.moment().format('DD.MM.YY, HH:mm');
    cy.get('#harvester-6 [data-test=last-execution]').should('contain', importsDate)
  });

  it('should show an icon if a harvester has an import schedule', () => {
    // set schedule
    cy.openScheduleHarvester("3");
    cy.get('[data-test="cron-input"]').clear().type('30 4 1 * 0,6');
    cy.get('[data-test=dlg-schedule]').click();

    cy.deactivateToggleBar('3');
    //check icon
    cy.get('#harvester-3 .mat-icon').should('contain', 'alarm_off');

    cy.activateToggleBar('3');
    cy.get('#harvester-3 .mat-icon').should('contain', 'alarm_on');

    cy.deactivateToggleBar('3');
  });
});

//TODO data-test attribute for following elements:
// Field for inserting cron pattern
//
