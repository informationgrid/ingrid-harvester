describe('Excel-Harvester operations', () => {
  before(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      cy.apiLogin('admin', 'admin');
    }
    cy.seedExcelHarvester();
  });

  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      cy.apiLogin('admin', 'admin');
    }
  });

  it('should add a harvester of type EXCEL', () => {
    //add harvester, check fields, delete it
    cy.addNewHarvester();
    cy.newExcelHarvester({
      description: 'Excel partial opts Harvester',
      indexName: 'excel_index',
      path: './data.xlsx'
    });
    cy.saveHarvesterConfig();

    cy.openHarvesterByName('Excel partial opts Harvester');

    cy.checkFields({
      description: 'Excel partial opts Harvester',
      indexName: 'excel_index',
      path: './data.xlsx'
    });

    cy.get('.mat-button-wrapper').contains('Abbrechen').click();
    cy.get('[data-test="delete"]:visible').click();
    cy.get('.mat-button-wrapper').contains('Löschen').click();
  });

  it('should add a new harvester of type Excel with all options', () => {
    cy.addNewHarvester();
    cy.newExcelHarvester({
      description: 'Excel full opts Harvester',
      indexName: 'full_excel_indice',
      path: './data.xlsx',
      defaultDCATCategory: 'Bevölkerung und Gesellschaft',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: '100',
      defaultAttributionLink: '23',
    });
    cy.saveHarvesterConfig();

    cy.openHarvesterByName('Excel full opts Harvester');
    cy.checkFields({
      description: 'Excel full opts Harvester',
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
    cy.openHarvesterByName('excel_test_api');
    cy.deselectDCATCategory('Wirtschaft und Finanzen');

    cy.setHarvesterFields({
      description: 'excel_update',
      indexName: 'update_excel_harvester',
      defaultDCATCategory: 'Wirtschaft und Finanzen',
      defaultAttribution: '7'
    });
    cy.updateHarvester();

    cy.checkFields({
      description: 'excel_update',
      indexName: 'update_excel_harvester',
      defaultDCATCategory: 'Wirtschaft und Finanzen',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: '7',
      path: './data.xlsx',
      startPosition: '1',
      maxRecords: '50'
    });

    //delete it
    cy.reload();
    cy.deleteHarvesterByName('excel_update');
  });
});
