describe('Csw-Harvester operations', () => {
  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      //user is not already logged in send request to log in
      cy.apiLogin('admin', 'admin');
    }
  });

  //CSW Harvesters operations
  it('add a harvester of type CSW', () => {
    cy.addNewHarvester();
    cy.newCswHarvester({
      description: 'Testing CSW Harvester',
      indexName: 'Testing CSW Harvester',
      httpMethod: 'GET',
      getRecordsUrl: './testme'
    });
    cy.saveHarvesterConfig();
  });

  it('update a harvester of type CSW', () => {
    cy.openHarvester('14');
    //if dcatCategory value to input already selected then deselect it
    cy.get('[name=defaultDCATCategory]')
      .then((dcatCat) => {
        if (dcatCat.text().includes('Verkehr')) {
          cy.get('[name=defaultDCATCategory]').click();
          cy.get('.mat-option-text').contains('Verkehr').click();
          cy.get('[name=defaultDCATCategory]').type('{esc}');
        }
      });

    //if mcloudCategory value to input already selected then deselect it
    cy.get('[name=defaultmCLOUDCategory]')
      .then((mcloudCat) => {
        if (mcloudCat.text().includes('Infrastruktur')) {
          cy.get('[name=defaultmCLOUDCategory]').click();
          cy.get('.mat-option-text').contains('Infrastruktur').click();
          cy.get('[name=defaultmCLOUDCategory]').type('{esc}');
        }
      });

    cy.setHarvesterFields({
      indexName: 'Testing update csw Harvester',
      defaultDCATCategory: 'Verkehr',
      defaultmCLOUDCategory: 'Infrastruktur',
      defaultAttribution: 'ffm'
    });
    cy.updateHarvester();

    //checks data was saved
    cy.openHarvester('14');
    cy.get('[name=defaultDCATCategory]').should('contain', 'Verkehr');
    cy.get('[name=defaultmCLOUDCategory]').should('contain', 'Infrastruktur');
    cy.get('[name=defaultAttribution]').should('have.value', 'ffm');
  });

  //CSW (import) operation
  it('should successfully harvest after deleting an existing filter-label', () => {
    cy.openHarvester('16'); // EOC Geoservice DLR
    cy.get('[name=recordFilter]').clear();
    cy.updateHarvester();
    cy.openAndImportHarvester("16");

    //import started & running
    cy.get('.mat-simple-snackbar').should('contain', 'Import gestartet');
    cy.get('app-importer-detail').should('contain', ' Import läuft ');

    cy.reload();
    cy.get('#harvester-16').click();
    cy.get('#harvester-16 [data-test="next-execution"]', {timeout: 10000}).should('contain', ' wurde geändert ');
  });
});
