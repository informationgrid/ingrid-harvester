describe('Csw-Harvester operations', () => {
  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      cy.apiLogin('admin', 'admin');
    }
  });

  it('should add a harvester of type CSW', () => {
    //add harvester, check fields and delete it
    cy.addNewHarvester();
    cy.newCswHarvester({
      description: 'Testing partial CSW Harvester',
      indexName: 'csw_index',
      httpMethod: 'GET',
      getRecordsUrl: './testme'
    });
    cy.saveHarvesterConfig();

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
    //deselect categories for test state
    cy.deselectDCATCategory('Verkehr');
    cy.deselectMcloudCategory('Infrastruktur');

    cy.setHarvesterFields({
      description: 'BFG',
      indexName: 'full_csw_indice',
      defaultDCATCategory: 'Verkehr',
      defaultmCLOUDCategory: 'Infrastruktur',
      defaultAttribution: 'ffm'
    });
    cy.updateHarvester();

    cy.reload();
    cy.openHarvester('14');

    //check fields
    cy.checkFields({
      description: 'BFG',
      indexName: 'full_csw_indice',
      defaultDCATCategory: 'Verkehr',
      defaultmCLOUDCategory: 'Infrastruktur',
      defaultAttribution: 'ffm'
    });
  });

  it('should successfully harvest after deleting an existing filter-label', () => {
    cy.openHarvester('16'); // CODEDE harvester
    cy.wait(500);

    cy.get('[formcontrolname="recordFilter"]').clear();
    cy.updateHarvester();
    cy.openAndImportHarvester("16");

    //import started
    cy.get('.mat-simple-snackbar').should('contain', 'Import gestartet');
    cy.get('app-importer-detail').should('contain', ' Import läuft ');

    //import is successful
    const importsDate = Cypress.moment().format('DD.MM.YY, HH:mm');
    cy.get('#harvester-16 [data-test=last-execution]', {timeout: 15000}).should('contain', importsDate)
  });
});
