/**
 * open harvester and start import process
 * @param harvesterId
 */
function openAndImportHarvester(harvesterId) {
  cy.get('#harvester-' + harvesterId).click();
  cy.get('#harvester-' + harvesterId + ' [data-test=import]').click();
}

/**
 * open harvester and schedule page
 * @param harvesterId
 */
function openScheduleHarvester(harvesterId) {
  cy.get('#harvester-' + harvesterId).click();
  cy.get('#harvester-' + harvesterId + ' [data-test=schedule]').click();
}

/**
 * ONLY open log page of a harvester, an harvester should already be opened
 * @param harvesterId
 */
function openLog(harvesterId) {
  cy.get('#harvester-' + harvesterId + ' [data-test=log]').click();
}

describe('TEST IMPORT OPERATIONS', () => {
  beforeEach(() => {
    if (!(window.localStorage.getItem('currentUser'))) {
      cy.apiLogin('admin', 'admin');
    }
  });

  it('open a harvester, start an import and check it is successful', () => {
    //opens "Offene Daten Bonn: parameters wrong"
    openAndImportHarvester(3);

    cy.get('.mat-simple-snackbar').should('contain', 'Import gestartet');
    cy.get('app-importer-detail').should('contain', ' Import läuft ');
  });

  it('plan an import, activate the auto-planning, check its execution and turn off the auto-planning', () => {
    openScheduleHarvester(6);

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

  it('import all harvesters at once and check a message is shown', () => {
    cy.importAll();
    cy.get('.mat-simple-snackbar').should('contain', 'Import von allen Harvestern gestartet');
  });

  it('show errors in the error-log if error/warning occurred during an import', () => {
    openAndImportHarvester(22);
    openLog(22);

    cy.get('.logContainer').should('contain', 'Error occurred creating index');
    cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
    cy.get('.logContainer').should('contain', '[invalid_index_name_exception] Invalid index name');
  });

  xit('after a successful import there is no error in the logs', () => {
    openAndImportHarvester(7);

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
            openLog(7);
            cy.get('.logContainer').should('contain', '');
            cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
            cy.get('.logContainer').should('contain', '');
          }
        })
      }
    });
  });

  xit('if the CKAN URL is not valid an error in the harvester logs is shown', () => {
    openAndImportHarvester(21);
    openLog(21);

    cy.get('.logContainer').should('contain', 'Error occurred creating index');
    cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
    cy.get('.logContainer').should('contain', '[invalid_index_name_exception] Invalid index name ');
  });

  it('if the CSW URL is not valid an error in the harvester logs is shown', () => {
    openAndImportHarvester(22);
    openLog(22);

    cy.get('.logContainer').should('contain', 'Error occurred creating index');
    cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
    cy.get('.logContainer').should('contain', '[invalid_index_name_exception] Invalid index name ');
  });

  it('if the Excel path is not valid an error in the harvester logs is shown', () => {
    openAndImportHarvester(20);
    openLog(20);

    cy.get('.logContainer').should('contain', 'Error occurred creating index');
    cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
    cy.get('.logContainer').should('contain', '[invalid_index_name_exception] Invalid index name ');
  });

  it('cron pattern "* *? * * *" is not a valid input and the planning button should be disabled', () => {
    openScheduleHarvester(20);

    cy.get('[placeholder="* * * * *"]').clear().type('* *? * * *');
    cy.get('.mat-dialog-actions > .mat-primary > .mat-button-wrapper').contains('Planen').should('be.disabled')
  });

  xit('disable scheduling for a harvester', () => {

  });
  xit('if scheduling is active its value is valid', () => {
  });
  xit('activate a scheduled importer', () => {
  });
  xit('deactivate a scheduled importer', () => {
  });
  xit('cannot activate a schedule import without an active auto-scheduling', () => {
  });
  xit('show reset cron expression if right cancel button is pressed', () => {
  });
  xit('when info button is pressed the informations are shown', () => {
  });
  xit('last import info of an harvester is shown after page refresh', () => {
  });
});

//TODO data-test attribute for following elements:
// Button containing "Planen" inside auto-schedule planning window
// Little x-Button used for deleting inserted cron expression (same window as ↑)
// Button "Anlegen" for saving harvester
// Button "Aktualisieren" for updating an existing harvester
