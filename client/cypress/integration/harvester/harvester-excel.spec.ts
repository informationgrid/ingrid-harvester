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

    // TODO: check harvester was really added with all data
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

    // TODO: check harvester was really added with all data
  });

  it('should update a harvester of type Excel', () => {
    cy.openHarvester('1');
    //if dcatCategory value to input already selected then deselect it
    // TODO: create general function to select from a select box
    cy.get('[formcontrolname="defaultDCATCategory"]')
      .then((dcatCat) => {
        if (dcatCat.text().includes('Wirtschaft und Finanzen')) {
          cy.get('[formcontrolname="defaultDCATCategory"]').click();
          cy.get('.mat-option-text').contains('Wirtschaft und Finanzen').click();
          cy.get('[formcontrolname="defaultDCATCategory"]').type('{esc}');
        }
      });
    //if mcloudCategory value to input already selected then deselect it
    // TODO: create general function to select from a select box (see above)
    cy.get('[formcontrolname=defaultMcloudSubgroup]')
      .then((mcloudCat) => {
        if (mcloudCat.text().includes('Klima und Wetter')) {
          cy.get('[formcontrolname="defaultMcloudSubgroup"]').click();
          cy.get('.mat-option-text').contains('Klima und Wetter').click();
          cy.get('[formcontrolname="defaultMcloudSubgroup"]').type('{esc}');
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
    cy.get('[formcontrolname="defaultDCATCategory"]').should('contain', 'Wirtschaft und Finanzen');
    cy.get('[formcontrolname="defaultMcloudSubgroup"]').should('contain', 'Klima und Wetter');
    cy.get('[formcontrolname="defaultAttribution"]').should('have.value', '7');
  });

});
