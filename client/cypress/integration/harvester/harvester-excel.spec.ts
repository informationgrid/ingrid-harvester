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
      description: 'Testing Excel Harvester',
      indexName: 'excel_indice',
      path: './data.xlsx'
    });
    cy.saveHarvesterConfig();
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
  });

  it('should update a harvester of type Excel', () => {
    cy.openHarvester('1');
    //if dcatCategory value to input already selected then deselect it
    cy.get('[name="defaultDCATCategory"]')
      .then((dcatCat) => {
        if (dcatCat.text().includes('Wirtschaft und Finanzen')) {
          cy.get('[name="defaultDCATCategory"]').click();
          cy.get('.mat-option-text').contains('Wirtschaft und Finanzen').click();
          cy.get('[name="defaultDCATCategory"]').type('{esc}');
        }
      });
    //if mcloudCategory value to input already selected then deselect it
    cy.get('[name=defaultmCLOUDCategory]')
      .then((mcloudCat) => {
        if (mcloudCat.text().includes('Klima und Wetter')) {
          cy.get('[name="defaultmCLOUDCategory"]').click();
          cy.get('.mat-option-text').contains('Klima und Wetter').click();
          cy.get('[name="defaultmCLOUDCategory"]').type('{esc}');
        }
      });

    cy.setHarvesterFields({
      indexName: 'Testing update ckan Harvester',
      defaultDCATCategory: 'Wirtschaft und Finanzen',
      defaultmCLOUDCategory: 'Klima und Wetter',
      defaultAttribution: '7'
    });
    cy.updateHarvester();

    cy.reload();
    //checks data was saved
    cy.openHarvester('1');
    cy.get('[name="defaultDCATCategory"]').should('contain', 'Wirtschaft und Finanzen');
    cy.get('[name="defaultmCLOUDCategory"]').should('contain', 'Klima und Wetter');
    cy.get('[name="defaultAttribution"]').should('have.value', '7');
  });

});
