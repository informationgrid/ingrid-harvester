describe('Csw-Harvester operations', () => {
  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      //user is not already logged in send request to log in
      cy.apiLogin('admin', 'admin');
    }
  });

  //CSW Harvesters operations
  it('should add a harvester of type CSW', () => {
    cy.addNewHarvester();
    cy.newCswHarvester({
      description: 'Testing CSW Harvester',
      indexName: 'csw_index',
      httpMethod: 'GET',
      getRecordsUrl: './testme'
    });
    cy.saveHarvesterConfig();

    // TODO: check harvester was really added with all data
  });

  xit('should add a new harvester of type CSW with all options', () => {
  });

  it('should update a harvester of type CSW', () => {
    cy.openHarvester('14');
    //if dcatCategory value to input already selected then deselect it
    cy.get('[formcontrolname=defaultDCATCategory]')
      .then((dcatCat) => {
        if (dcatCat.text().includes('Verkehr')) {
          cy.get('[formcontrolname="defaultDCATCategory"]').click();
          cy.get('.mat-option-text').contains('Verkehr').click();
          cy.get('[formcontrolname="defaultDCATCategory"]').type('{esc}');
        }
      });

    //if mcloudCategory value to input already selected then deselect it
    cy.get('[formcontrolname=defaultMcloudSubgroup]')
      .then((mcloudCat) => {
        if (mcloudCat.text().includes('Infrastruktur')) {
          cy.get('[formcontrolname="defaultMcloudSubgroup"]').click();
          cy.get('.mat-option-text').contains('Infrastruktur').click();
          cy.get('[formcontrolname="defaultMcloudSubgroup"]').type('{esc}');
        }
      });

    cy.setHarvesterFields({
      indexName: 'full_csw_indice',
      defaultDCATCategory: 'Verkehr',
      defaultmCLOUDCategory: 'Infrastruktur',
      defaultAttribution: 'ffm'
    });
    cy.updateHarvester();

    //checks data was saved
    cy.openHarvester('14');
    cy.get('[formcontrolname="defaultDCATCategory"]').should('contain', 'Verkehr');
    cy.get('[formcontrolname="defaultMcloudSubgroup"]').should('contain', 'Infrastruktur');
    cy.get('[formcontrolname="defaultAttribution"]').should('have.value', 'ffm');
  });

  //CSW operation
  it('should successfully harvest after deleting an existing filter-label', () => {
    cy.openHarvester('16'); // EOC Geoservice DLR
    cy.get('[formcontrolname="recordFilter"]').clear();
    cy.updateHarvester();
    cy.openAndImportHarvester("16");

    //import started
    cy.get('.mat-simple-snackbar').should('contain', 'Import gestartet');
    cy.get('app-importer-detail').should('contain', ' Import läuft ');

    cy.get('#harvester-16').click();
    // TODO: why should next-execution contain "wurde geändert"? Was there any scheduler set?
    cy.get('#harvester-16 [data-test="next-execution"]', {timeout: 15000}).should('contain', ' wurde geändert ');
  });
});
