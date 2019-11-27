describe('Import log operations', () => {
  let Constants = require("../../support/constants");
  const constants = new Constants();

  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();

  beforeEach(() => {
    auth.apiLoginWithUserCheck();
  });

  it('should show errors in the error-log if error/warning occurred during an import', () => {
    cy.openAndImportHarvester(constants.CKAN_TEST_ID);
    cy.openLog(constants.CKAN_TEST_ID);

    //check error log
    cy.get('.logContainer').should('contain', 'Error:');
    //check elastic-search error log
    // cy.get('.mat-tab-label-content', {timeout:10000}).contains('Elasticsearch-Errors').click();
    // cy.get('.logContainer').should('contain', '[invalid_index_name_exception] Invalid index name');
  });

  it('should show no error in the logs after a successful import', () => {
    cy.openAndImportHarvester(constants.CKAN_RNV_ID);

    cy.get('#harvester-' + constants.CKAN_RNV_ID + ' [data-test=num-errors]', {timeout:10000}).scrollIntoView();
    cy.get('#harvester-' + constants.CKAN_RNV_ID + ' [data-test=num-errors]').invoke('text').then((numErr) => {
      //no errors
      if (numErr.toString() === '0') {
        cy.get('#harvester-' + constants.CKAN_RNV_ID + ' [data-test=num-warnings]').invoke('text').then((numWarnings) => {
          //no warnings
          if (numWarnings.toString() === '0') {
            cy.get('#harvester-' + constants.CKAN_RNV_ID + ' [data-test=log]').should('be.disabled');
          }
          //there are warnings
          else {
            //check log that there are no errors, only warnings
            cy.openLog(constants.CKAN_RNV_ID);
            cy.get('.logContainer').should('contain', '');
            cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
            cy.get('.logContainer').should('contain', '');
          }
        });
      }
    });
  });

  it('should show an error in the harvester logs if the CKAN index name is invalid', () => {
    cy.openAndImportHarvester(constants.CKAN_TEST_ID);
    cy.openLog(constants.CKAN_TEST_ID);

    cy.get('.logContainer').should('contain', 'Error:');
    // elastic search errors
    // cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
    // cy.get('.logContainer').should('contain', '[invalid_index_name_exception] Invalid index name ');
  });

  it('should show an error in the harvester logs if the CKAN url is invalid', () => {
    cy.openHarvester(constants.CKAN_TEST_ID);

    cy.wait(500);

    cy.setHarvesterFields({indexName: 'ckan_test'});
    cy.updateHarvester();

    cy.openAndImportHarvester(constants.CKAN_TEST_ID);
    cy.openLog(constants.CKAN_TEST_ID);

    cy.get('.logContainer').should('contain', 'Error: Invalid URI');
  });

  it('should show an error in the harvester logs if the CSW URL is not valid ', () => {
    cy.openAndImportHarvester(constants.CSW_TEST_ID); //TODO: id fix
    cy.openLog(constants.CSW_TEST_ID);

    cy.get('.logContainer').should('not.have.text', '');
    // elastic search errors
    // cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
    // cy.get('.logContainer').should('not.have.text', '');
  });

  it('should show an error in the harvester logs if the Excel path is not valid', () => {
    cy.openAndImportHarvester(constants.EXCEL_TEST_ID);
    cy.openLog(constants.EXCEL_TEST_ID);

    cy.get('.logContainer').should('contain', 'Error reading excel workbook: Error: ');
    // cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
    // cy.get('.logContainer').should('contain', '[invalid_index_name_exception] Invalid index name ');
  });
});
