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
      description: 'Testing partial CSW Harvester',
      indexName: 'csw_index',
      httpMethod: 'GET',
      getRecordsUrl: './testme'
    });
    cy.saveHarvesterConfig();

    //get harvester by name
    cy.openHarvesterByName('Testing partial CSW Harvester');

    cy.checkFields({
      description: 'Testing partial CSW Harvester',
      indexName: 'csw_index',
      httpMethod: 'GET',
      getRecordsUrl: './testme'
    });

    cy.get('.mat-button-wrapper').contains('Abbrechen').click();
    cy.get('[data-test="delete"]:visible').click();
    cy.get('.mat-button-wrapper').contains('Löschen').click();
  });

  it('should add a new harvester of type CSW with all options', () => {
    cy.addNewHarvester();
    cy.newCswHarvester({
      description: 'Testing CSW Harvester',
      indexName: 'full_csw_index',
      httpMethod: 'POST',
      getRecordsUrl: './testme',
      defaultDCATCategory: 'Wissenschaft und Technologie',
      defaultmCLOUDCategory: 'Straßen',
      defaultAttribution: 'testing_csw',
      defaultAttributionLink: 'https://sike.fake',
      maxRecords: '50',
      startPosition: '0',
      recordFilter: 'opendata',
      keywords: 'this_is_a_test'
    });
    cy.saveHarvesterConfig();

    cy.get('.no-wrap').contains('Testing CSW Harvester').click();
    cy.get('[data-test="edit"]:visible').click();

    cy.checkFields({
      description: 'Testing CSW Harvester',
      indexName: 'full_csw_index',
      httpMethod: 'POST',
      getRecordsUrl: './testme',
      defaultDCATCategory: 'Wissenschaft und Technologie',
      defaultmCLOUDCategory: 'Straßen',
      defaultAttribution: 'testing_csw',
      defaultAttributionLink: 'https://sike.fake',
      maxRecords: '50',
      startPosition: '0'
    });

    cy.get('.mat-button-wrapper').contains('Abbrechen').click();
    cy.get('[data-test="delete"]:visible').click();
    cy.get('.mat-button-wrapper').contains('Löschen').click();
  });

  it('should update a harvester of type CSW', () => {
    cy.openHarvester('14');
    cy.deselectDCATCategory('Verkehr');
    cy.deselectMcloudCategory('Infrastruktur');

    cy.setHarvesterFields({
      indexName: 'full_csw_indice',
      defaultDCATCategory: 'Verkehr',
      defaultmCLOUDCategory: 'Infrastruktur',
      defaultAttribution: 'ffm'
    });

    cy.updateHarvester();
    cy.reload();
    cy.openHarvester('14');

    //checks data was saved
    cy.checkFields({
      indexName: 'full_csw_indice',
      defaultDCATCategory: 'Verkehr',
      defaultmCLOUDCategory: 'Infrastruktur',
      defaultAttribution: 'ffm'
    });
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
    // TODO: why should next-execution contain "wurde geändert"? Was there any scheduler set?#
    // it's a bug! new ticket!
    cy.get('#harvester-16 [data-test="next-execution"]', {timeout: 15000}).should('contain', ' wurde geändert ');
  });
});
