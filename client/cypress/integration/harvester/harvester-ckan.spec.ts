describe('Ckan-Harvester operations', () => {
  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      //user is not already logged in send request to log in
      cy.apiLogin('admin', 'admin');
    }
  });
  //CKAN Harvesters operations
  it('should add a harvester of type CKAN', () => {
    cy.addNewHarvester();
    cy.newCkanHarvester({
      description: 'Testing CKAN Harvester',
      indexName: 'ckan_indice',
      ckanBasisUrl: 'testme'
    });
    cy.saveHarvesterConfig();
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
  });

  it('should update an existing CKAN harvester', () => {
    cy.openHarvester('3');

    cy.setHarvesterFields({
      indexName: 'ckan_indice',
      defaultAttribution: 'ffm',
      filterTag: 'ckan_test1',
      filterGroup: 'ckan_test1',
      dateFormat: 'YYYY-MM-DD',
    });
    cy.updateHarvester();

    //checks data was saved
    cy.openHarvester('3');
    cy.get('[name=index]').should('have.value', 'ckan_indice');
    cy.get('[name=defaultAttribution]').should('have.value', 'ffm');
    cy.get(' .mat-chip-list-wrapper [role="option"]').should('contain', 'ckan_test1');
  })
});
