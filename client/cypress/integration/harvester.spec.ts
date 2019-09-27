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
    cy.visit('');
    cy.login('admin', 'admin');
  });

  describe('Import', () => {
    it.only('should start an import and check it is successful', () => {
      //opens "Deutsche Bahn Datenportal"
      cy.get('#harvester-6').click();
      cy.get('[data-test=import]:visible').click();
      cy.get('.mat-simple-snackbar').should('contain','Import gestartet');

      cy.get('[data-test="next-execution"]').should('contain', ' wurde geändert ');

    });

    it.only('should plan an import, activate the auto-planning and check it is performed', () => {
      cy.get('#harvester-6').click();
      cy.get('[data-test=schedule]:visible').click(); //
      cy.get('[placeholder="* * * * *"]').clear().type('* * * * *');

      cy.get('.mat-button:visible').contains('Planen').click();

      //TODO

    });
    it('should import all harvesters at once', () => {
      cy.importAll();
      cy.get('.mat-simple-snackbar').should('contain','Import von allen Harvestern gestartet');
    });
    xit('should show an error-log if an import error/warning occurred', () => {
    });
    xit('should not show an error-log if import was successful', () => {
    });
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

