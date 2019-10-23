describe('Ckan-Harvester operations', () => {
  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      //user is not already logged in send request to log in
      cy.apiLogin('admin', 'admin');
    }
  });
  //CKAN Harvesters operations
  it('add a harvester of type CKAN', () => {
    cy.addNewHarvester();
    cy.newCkanHarvester({
      description: 'Testing CKAN Harvester',
      indexName: 'Testing CKAN Harvester',
      ckanBasisUrl: 'testme'
    });
    cy.saveHarvesterConfig();
  });

});
