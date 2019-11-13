describe('Import operations', () => {
  beforeEach(() => {
    if (!(window.localStorage.getItem('currentUser'))) {
      cy.apiLogin('admin', 'admin');
    }
  });

  it('should open a harvester, start an import and check it is successful', () => {
    cy.openAndImportHarvester("6");
    const importsDate = Cypress.moment().format('DD.MM.YY, HH:mm');

    cy.get('.mat-simple-snackbar').should('contain', 'Import gestartet');
    cy.get('app-importer-detail').should('contain', ' Import läuft ');
    cy.wait(5000);
    cy.reload();

    cy.get('#harvester-3 [data-test=last-execution]').should('contain', importsDate)
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

    //check icon
    cy.get('#harvester-3 .mat-icon').should('contain', 'alarm_off');
    //activate auto planning and check the right status of the icon
    cy.get('#harvester-3 .mat-slide-toggle-bar').click({force: true});
    cy.get('#harvester-3 .mat-icon').should('contain', 'alarm_on');
    //deactivate again
    cy.get('#harvester-3 .mat-slide-toggle-bar').click({force: true});
  });
});

//TODO data-test attribute for following elements:
// Field for inserting cron pattern
//
