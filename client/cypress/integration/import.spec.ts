describe('TEST IMPORT OPERATIONS', () => {
  beforeEach(() => {
    if(!(window.localStorage.getItem('currentUser'))){
      //user is not already logged in send request to log in
      cy.apiLogin('admin', 'admin');
    }
  });

  it.only('should start an import and check it is successful', () => {
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

    cy.get('[data-test="next-execution"]').should('not.contain', 'wurde geändert');
    cy.get('[data-test="next-execution"]').should('not.contain', '');

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
