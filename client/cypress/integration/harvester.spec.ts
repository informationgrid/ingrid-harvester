/**
 * press button for adding a new harvester
 */
function addNewHarvester() {
  cy.get('#btnAddHarvester').click()
}

/**
 * press button for opening an existing harvester with given ID and updates it
 */
function openHarvester(harvesterId) {
  cy.get('#harvester-' + harvesterId).click();
  // cy.get('#harvester-' + harvesterId).click();
  cy.get('[data-test="edit"]').filter(':visible').click();
}

/**
 * press button to lay a new harvester
 */
function saveHarvesterConfig() {
  cy.get('.mat-button').contains('Anlegen').click();
}

/**
 * press button to update an old harvester
 */
function updateHarvester() {
  cy.get('.mat-button').contains('Aktualisieren').click();
}

describe('Harvester', () => {

  beforeEach(() => {
    cy.apiLogin('admin', 'admin');
  });

  describe('Import', () => {
    it('should start an import and check it is successful', () => {
      //opens "Offene Daten Bonn: parameters wrong"
      cy.get('#harvester-3').click();
      cy.get('[data-test=import]:visible').click();
      cy.get('.mat-simple-snackbar').should('contain', 'Import gestartet');
      cy.get('app-importer-detail').should('contain', ' Import läuft ');
    });

    it('should plan an import, activate the auto-planning, check it is executed and turn off the auto-planning', () => {
      cy.get('#harvester-6').click();
      cy.get('[data-test=schedule]:visible').click(); //
      cy.get('[placeholder="* * * * *"]').clear().type('* * * * *');

      cy.get('.mat-dialog-actions > .mat-primary > .mat-button-wrapper').contains('Planen').click();

      cy.get('[data-test="next-execution"]').should('contain', ' wurde geändert ');

      //turn off pattern too
      cy.get('[data-test=schedule]:visible').click();
      cy.get('.mat-form-field-suffix > .mat-button > .mat-button-wrapper > .mat-icon').click();
      cy.get('.mat-dialog-actions > .mat-primary > .mat-button-wrapper').contains('Planen').click();
    });

    it('should import all harvesters at once', () => {
      cy.importAll();
      cy.get('.mat-simple-snackbar').should('contain', 'Import von allen Harvestern gestartet');
    });

    it('should show an error-log if an import error/warning occurred', () => {
      //creates an excel harvester with wrong path if not existing already
/*      addNewHarvester();
      cy.fillExcelHarvester({
        description: 'Testing Excel Harvester',
        indexName: 'Testing Excel Harvester',
        path: './data.xlsx'
      });
      saveHarvesterConfig();*/
      cy.get('#harvester-22').click();
      cy.get('[data-test=import]:visible').click();
      cy.get('[data-test=log]:visible').click();
      cy.get('.logContainer').should('contain', 'Error reading excel workbook: Error occurred creating index');
      cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
      cy.get('.logContainer').should('contain', '[invalid_index_name_exception] Invalid index name');
    });

    /*it.only('should not show an error-log if import was successful', () => {
      cy.get('#harvester-7').click();
      cy.get('[data-test=import]:visible').click();
      cy.wait(700);
      cy.get('[data-test=num-errors]:visible').invoke('text').then((numErr) => {
        //no errors
        if(numErr.toString() === '0'){
          cy.get('[data-test=num-warnings]:visible').invoke('text').then((numWarnings) => {
            //no warnings
            if(numWarnings.text() === '0'){
              cy.get('[data-test=log]:visible').should('be.disabled');
            }
            //there are warnings
            else {
              //check log that there are no errors, only warnings
              cy.get('[data-test=log]:visible').click();
              cy.get('.logContainer').should('contain', '');
              cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
              cy.get('.logContainer').should('contain', '');
            }
          })
        }


        });
    });*/

    xit('should show an error if CKAN URL is not valid', () => {
    });
    xit('should show an error if CSW URL is not valid', () => {
    });
    xit('should show an error if Excel path is not valid', () => {
    });
    xit('show not allow to add cron pattern "* *? * * *"', () => {
    });
    xit('should disable scheduling for a harvester', () => {
    });
    xit('should have a valid value if scheduling is active', () => {
    });
    xit('should activate a scheduled importer', () => {
    });
    xit('should deactivate a scheduled importer', () => {
    });
    xit('should not be able to activate an importer without scheduling', () => {
    });
    xit('should show reset cron expression if right cancel button is pressed', () => {
    });
    xit('should show information when info button is pressed', () => {
    });
    xit('should show last import info after page refresh', () => {
    });
    xit('should show last import info after page refresh', () => {
    });

  });

  describe('Add/Update', () => {
    it('should add a harvester of type CKAN', () => {
      addNewHarvester();
      cy.fillCkanHarvester({
        description: 'Testing CKAN Harvester',
        indexName: 'Testing CKAN Harvester',
        ckanBasisUrl: 'testme'
      });
      saveHarvesterConfig()
    });

    it('should add a harvester of type CSW', () => {
      addNewHarvester();
      cy.fillCswHarvester({
        description: 'Testing CSW Harvester',
        indexName: 'Testing CSW Harvester',
        httpMethod: 'GET',
        getRecordsUrl: './testme'
      });
      saveHarvesterConfig();
    });

    it('should add a harvester of type EXCEL', () => {
      addNewHarvester();
      cy.fillExcelHarvester({
        description: 'Testing Excel Harvester',
        indexName: 'Testing Excel Harvester',
        path: './data.xlsx'
      });
      saveHarvesterConfig();
    });

    xit('should update a harvester of type CKAN', () => {
      openHarvester('37');
      //must also pass the required variables
      cy.fillExistingCkanHarvester({
        description: 'Testing update ckan Harvester',
        indexName: 'Testing update ckan Harvester',
        defaultDCATCategory: 'Energie',
        defaultmCLOUDCategory: 'Infrastruktur',
        defaultAttribution: '1'
      });
      updateHarvester();

      //checks that the entered data has been saved
      openHarvester('37');
      cy.get('[name="defaultDCATCategory"]').should('contain', 'Energie');
      cy.get('[name="defaultmCLOUDCategory"]').should('contain', 'Infrastruktur');
      cy.get('[name="defaultAttribution"]').should('have.value', '1');
    });

    xit('should update a harvester of type CSW', () => {
    });
    xit('should update a harvester of type Excel', () => {
    });

    xit('should not be possible to change type during update', () => {
    });

    xit('should not be possible to set startPosition below 0', () => {
    });
    xit('should not be possible to set maxRecords below 0', () => {
    });

    it('should complete a harvester of type Excel', () => {
      addNewHarvester();
      cy.fillExcelHarvester({
        description: 'Testing Excel Harvester',
        indexName: 'Testing Excel Harvester',
        path: './data.xlsx',
        defaultDCATCategory: 'Bevölkerung und Gesellschaft',
        defaultmCLOUDCategory: 'Bahn',
        defaultAttribution: '100',
        defaultAttributionLink: '23',
        maxRecords: 'capa'
      });
      saveHarvesterConfig();
    });

  });
});

