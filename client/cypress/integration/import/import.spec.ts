describe('Import operations', () => {
  beforeEach(() => {
    if (!(window.localStorage.getItem('currentUser'))) {
      cy.apiLogin('admin', 'admin');
    }
  });

  it('should open a harvester, start an import and check it is successful', () => {
    //opens "Offene Daten Bonn: parameters wrong"
    cy.openAndImportHarvester("3");

    cy.get('.mat-simple-snackbar').should('contain', 'Import gestartet');
    cy.get('app-importer-detail').should('contain', ' Import läuft ');
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
    //check today's date und hour
    const importsDate = Cypress.moment().format('DD.MM.YY, HH:mm');

    //antipattern
    cy.wait(5000);
    cy.reload();
    cy.get('#harvester-6 [data-test=last-execution]').should('contain', importsDate)
  });
});

//TODO data-test attribute for following elements:
// Button containing "Alle importieren" at "../importer/harvester"
// Field for inserting cron pattern
// Info button in cron pattern, it shows cron pattern syntax
