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

  it('should plan an import, activate the auto-planning, check its execution and turn off the auto-planning', () => {
    cy.openScheduleHarvester("6");

    cy.get('[placeholder="* * * * *"]').clear().type('* * * * *');

    cy.get('.mat-dialog-actions > .mat-primary > .mat-button-wrapper').contains('Planen').click();

    cy.get('[data-test=next-execution]').should('not.contain', 'wurde geändert');
    cy.get('[data-test=next-execution]').should('not.contain', '');

    //turn off pattern
    cy.get('#harvester-6 [data-test=schedule]').click();
    //press little x
    cy.get('.mat-form-field-suffix > .mat-button > .mat-button-wrapper > .mat-icon').click();
    cy.get('.mat-dialog-actions > .mat-primary > .mat-button-wrapper').contains('Planen').click();
  });

  it('should import all harvesters at once and check a message is shown', () => {
    cy.importAll();
    cy.get('.mat-simple-snackbar').should('contain', 'Import von allen Harvestern gestartet');
  });

  it('should show errors in the error-log if error/warning occurred during an import', () => {
    cy.openAndImportHarvester("22");
    cy.openLog("22");

    cy.get('.logContainer').should('contain', 'Error occurred creating index');
    cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
    cy.get('.logContainer').should('contain', '[invalid_index_name_exception] Invalid index name');
  });

  xit('should show no error in the logs after a successful import', () => {
    cy.openAndImportHarvester("7");

    cy.get('[#harvester-7 data-test=num-errors]').invoke('text').then((numErr) => {
      //no errors
      if (numErr.toString() === '0') {
        cy.get('[#harvester-7 data-test=num-warnings]').invoke('text').then((numWarnings) => {
          //no warnings
          if (numWarnings.text() === '0') {
            cy.get('#harvester-7 [data-test=log]').should('be.disabled');
          }
          //there are warnings
          else {
            //check log that there are no errors, only warnings
            cy.openLog("7");
            cy.get('.logContainer').should('contain', '');
            cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
            cy.get('.logContainer').should('contain', '');
          }
        })
      }
    });
  });

  xit('should show an error in the harvester logs if the CKAN URL is not valid', () => {
    cy.openAndImportHarvester("21");
    cy.openLog("21");

    cy.get('.logContainer').should('contain', 'Error occurred creating index');
    cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
    cy.get('.logContainer').should('contain', '[invalid_index_name_exception] Invalid index name ');
  });

  it('should show an error in the harvester logs if the CSW URL is not valid ', () => {
    cy.openAndImportHarvester("22");
    cy.openLog("22");

    cy.get('.logContainer').should('contain', 'Error occurred creating index');
    cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
    cy.get('.logContainer').should('contain', '[invalid_index_name_exception] Invalid index name ');
  });

  it('should show an error in the harvester logs if the Excel path is not valid', () => {
    cy.openAndImportHarvester("20");
    cy.openLog("20");

    cy.get('.logContainer').should('contain', 'Error occurred creating index');
    cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
    cy.get('.logContainer').should('contain', '[invalid_index_name_exception] Invalid index name ');
  });

  it('should not be able to input the cron pattern "* *? * * *" (the planning button should be disabled)', () => {
    cy.openScheduleHarvester("20");

    cy.get('[placeholder="* * * * *"]').clear().type('* *? * * *');
    cy.get('.mat-dialog-actions > .mat-primary > .mat-button-wrapper').contains('Planen').should('be.disabled')
  });

  xit('should disable scheduling for a harvester', () => {

  });
  xit('should have a valid scheduling value if scheduling is active', () => {
  });
  xit('should activate a scheduled importer', () => {
  });
  xit('should deactivate a scheduled importer', () => {
  });
  xit('should not be able to activate a scheduled import without an active auto-scheduling', () => {
  });
  xit('should reset cron expression if right cancel button is pressed', () => {
  });
  xit('should show respective informations if info button is pressed', () => {
  });
  xit('should show last import info of an harvester after page refresh', () => {
  });
});

//TODO data-test attribute for following elements:
// Button containing "Planen" inside auto-schedule planning window
// Little x-Button used for deleting inserted cron expression (same window as ↑)
// Button "Anlegen" for saving harvester
// Button "Aktualisieren" for updating an existing harvester
