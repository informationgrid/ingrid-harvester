describe('Ckan-Harvester operations', () => {
  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      cy.apiLogin('admin', 'admin');
    }
  });

  it('should add a harvester of type CKAN', () => {
    //harvester is created and after a check on the fields deleted
    cy.addNewHarvester();
    cy.newCkanHarvester({
      description: 'Testing CKAN Harvester',
      indexName: 'ckan_index',
      ckanBasisUrl: 'testme'
    });
    cy.saveHarvesterConfig();

    cy.openHarvesterByName('Testing CKAN Harvester');

    cy.checkFields({
      description: 'Testing CKAN Harvester',
      indexName: 'ckan_index',
      ckanBasisUrl: 'testme'
    });

    //delete the harvester
    cy.get('.mat-button-wrapper').contains('Abbrechen').click();
    cy.get('[data-test="delete"]:visible').click();
    cy.get('.mat-button-wrapper').contains('Löschen').click();
  });

  it('should add a harvester of type CKAN with all options', () => {
    cy.addNewHarvester();
    cy.newCkanHarvester({
      description: 'Testing full CKAN Harvester',
      indexName: 'full_ckan_indice',
      ckanBasisUrl: 'test me',
      defaultDCATCategory: 'Bevölkerung und Gesellschaft',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: 'Offene Testdaten',
      defaultAttributionLink: 'AttributionLink',
      maxRecords: '10',
      startPosition: '1',
      filterTag: 'ckan_test',
      filterGroup: 'ckan_test',
      dateFormat: 'YYYY-MM-DD',
      licenseId: '325',
      titleId: 'titleID',
      licenseUrl: 'wwwdedede'
    });
    cy.saveHarvesterConfig();

    cy.openHarvesterByName('Testing full CKAN Harvester');

    cy.checkFields({
      description: 'Testing full CKAN Harvester',
      indexName: 'full_ckan_indice',
      ckanBasisUrl: 'test me',
      defaultDCATCategory: 'Bevölkerung und Gesellschaft',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: 'Offene Testdaten',
      defaultAttributionLink: 'AttributionLink',
      maxRecords: '10',
      startPosition: '1',
      // filterTag: 'ckan_test',
      // filterGroup: 'ckan_test',
      // dateFormat: 'YYYY-MM-DD',
      licenseId: '325',
      titleId: 'titleID',
      licenseUrl: 'wwwdedede'
    });

    //delete the harvester
    cy.get('.mat-button-wrapper').contains('Abbrechen').click();
    cy.get('[data-test="delete"]:visible').click();
    cy.get('.mat-button-wrapper').contains('Löschen').click();
  });

  it('should update an existing CKAN harvester', () => {
    cy.openHarvester('3');
    cy.setHarvesterFields({
      description: '!Offene Daten Bonn: parameters wrong',
      indexName: 'updated_ckan',
      defaultAttribution: 'ffm',
      filterTag: 'ckan_test1',
      filterGroup: 'ckan_test1',
      dateFormat: 'YYYY-MM-DD'
    });
    cy.updateHarvester();

    cy.openHarvester('3');
    cy.checkFields({
      indexName: 'updated_ckan',
      defaultAttribution: 'ffm',
      description: '!Offene Daten Bonn: parameters wrong',
      ckanBasisUrl: 'https://opendata.bonn.de',
      defaultDCATCategory: 'Regionen und Städte',
      defaultmCLOUDCategory: 'Straßen',
      maxRecords: '100',
      startPosition: '0'
    });
  })
});
