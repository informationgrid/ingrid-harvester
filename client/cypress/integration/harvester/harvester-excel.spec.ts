describe('Excel-Harvester operations', () => {
  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      //user is not already logged in send request to log in
      cy.apiLogin('admin', 'admin');
    }
  });

  //Excel Harvesters operations
  it('should add a harvester of type EXCEL', () => {
    cy.addNewHarvester();
    cy.newExcelHarvester({
      description: 'Testing partial Excel Harvester',
      indexName: 'excel_indice',
      path: './data.xlsx'
    });
    cy.saveHarvesterConfig();

    //get harvester by name
    cy.openHarvesterByName('Testing partial Excel Harvester');

    cy.checkFields({
      description: 'Testing partial Excel Harvester',
      indexName: 'excel_indice',
      path: './data.xlsx'
    });

    //delete the harvester
    cy.get('.mat-button-wrapper').contains('Abbrechen').click();
    cy.get('[data-test="delete"]:visible').click();
    cy.get('.mat-button-wrapper').contains('Löschen').click();
  });

  it('should add a new harvester of type Excel with all options', () => {
    cy.addNewHarvester();
    cy.newExcelHarvester({
      description: 'Testing Excel Harvester',
      indexName: 'full_excel_indice',
      path: './data.xlsx',
      defaultDCATCategory: 'Bevölkerung und Gesellschaft',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: '100',
      defaultAttributionLink: '23',
    });
    cy.saveHarvesterConfig();

    //get harvester by name
    cy.openHarvesterByName('Testing Excel Harvester');

    //check input is right
    cy.checkFields({
      description: 'Testing Excel Harvester',
      indexName: 'full_excel_indice',
      path: './data.xlsx',
      defaultDCATCategory: 'Bevölkerung und Gesellschaft',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: '100',
      defaultAttributionLink: '23'
    });

    //delete the harvester
    cy.get('.mat-button-wrapper').contains('Abbrechen').click();
    cy.get('[data-test="delete"]:visible').click();
    cy.get('.mat-button-wrapper').contains('Löschen').click();
  });

  it('should update a harvester of type Excel', () => {
    cy.openHarvester('1');
    cy.deselectDCATCategory('Wirtschaft und Finanzen');
    cy.deselectMcloudCategory('Klima und Wetter');

    cy.setHarvesterFields({
      indexName: 'Testing update ckan Harvester',
      defaultDCATCategory: 'Wirtschaft und Finanzen',
      defaultmCLOUDCategory: 'Klima und Wetter',
      defaultAttribution: '7'
    });

    cy.updateHarvester();
    cy.reload();
    cy.openHarvester('1');

    //check the data was saved
    cy.checkFields({
      defaultDCATCategory: 'Wirtschaft und Finanzen',
      defaultmCLOUDCategory: 'Klima und Wetter',
      defaultAttribution: '7'
    });
  });
});
