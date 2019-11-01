describe('Import log operations', () => {
  beforeEach(() => {
    if (!(window.localStorage.getItem('currentUser'))) {
      cy.apiLogin('admin', 'admin');
    }
  });

  it('should show errors in the error-log if error/warning occurred during an import', () => {
    cy.openAndImportHarvester("21");
    cy.openLog("21");

    // cy.get('.logContainer').should('contain', 'Error occurred creating index');
    cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
    cy.get('.logContainer').should('contain', '[invalid_index_name_exception] Invalid index name');
  });

  it('should show no error in the logs after a successful import', () => {
    cy.openAndImportHarvester("7");
    cy.get('#harvester-7 [data-test=num-errors]').scrollIntoView({timeout:7000});
    cy.get('#harvester-7 [data-test=num-errors]').invoke('text').then((numErr) => {
      //no errors
      if (numErr.toString() === '0') {
        cy.get('#harvester-7 [data-test=num-warnings]').invoke('text').then((numWarnings) => {
          //no warnings
          if (numWarnings.toString() === '0') {
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

  it('should show an error in the harvester logs if the CKAN URL is not valid', () => {
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
    cy.openAndImportHarvester("1");
    cy.openLog("1");

    cy.get('.logContainer').should('contain', 'Error occurred creating index');
    cy.get('.mat-tab-label-content').contains('Elasticsearch-Errors').click();
    cy.get('.logContainer').should('contain', '[invalid_index_name_exception] Invalid index name ');
  });
});
