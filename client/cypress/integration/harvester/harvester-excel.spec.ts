describe('Excel-Harvester operations', () => {
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
    cy.openHarvester('1');
    cy.deselectDCATCategory('Wirtschaft und Finanzen');
    cy.deselectMcloudCategory('Klima und Wetter');

    cy.setHarvesterFields({
      description: 'mCLOUD Excel Datei',
      indexName: 'update_excel_harvester',
      defaultDCATCategory: 'Wirtschaft und Finanzen',
      defaultmCLOUDCategory: 'Klima und Wetter',
      defaultAttribution: '7'
    });
    cy.updateHarvester();

    cy.reload();

    cy.openHarvester('1');
    cy.checkFields({
      description: 'mCLOUD Excel Datei',
      indexName: 'update_excel_harvester',
      defaultDCATCategory: 'Wirtschaft und Finanzen',
      defaultmCLOUDCategory: 'Klima und Wetter',
      defaultAttribution: '7',
      path: './data.xlsx'
    });
  });
});
