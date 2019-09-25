/**
 * press button for adding a new harvester
 */
function newHarvester() {
  cy.get('#btnAddHarvester').click()
}

/**
 * press button for opening an existing harvester with given ID and updates it
 */
function openHarvester(harvesterId) {
  cy.get('#harvester-' + harvesterId).click();
  cy.get('data-test="edit"').click();
}

/**
 * press button to lay a new harvester
 */
function layHarvester() {
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
    xit('should start an import and check it is successful', () => {
    });
    xit('should plan an import, activate the auto-planning and check it is performed', () => {
    });
    xit('should import all at once', () => {
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
  });

  describe('Add/Update', () => {
    it('should add a harvester of type CKAN', () => {
      newHarvester();
      cy.fillCkanHarvester({
        description: 'Testing CKAN Harvester',
        indexName: 'Testing CKAN Harvester',
        ckanBasisUrl: 'testme'
      });
      layHarvester()
    });

    it('should add a harvester of type CSW', () => {
      newHarvester();
      cy.fillCswHarvester({
        description: 'Testing CSW Harvester',
        indexName: 'Testing CSW Harvester',
        httpMethod: 'GET',
        getRecordsUrl: './testme'
      });
      layHarvester();
    });

    it('should add a harvester of type EXCEL', () => {
      newHarvester();
      cy.fillExcelHarvester({
        description: 'Testing Excel Harvester',
        indexName: 'Testing Excel Harvester',
        path: './data.xlsx'
      });
      layHarvester();
    });

    xit('should update a harvester of type CKAN', () => {
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
    xit('should complete a harvester of type Excel', () => {
    });

  });
});

