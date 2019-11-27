describe('Indices operations', () => {
  let Constants = require("../support/constants");
  const constants = new Constants();

  const Authentication = require("../support/pageObjects/auth");
  const auth = new Authentication();
  const IndicesPage = require('../support/pageObjects/indices');
  const indicesPage = new IndicesPage();

  beforeEach(() => {
    auth.apiLoginWithUserCheck();
  });

  it('should not find an harvester whose search is not activated', () => {
    //if search is on, turn it off
    cy.deactivateToggleBar(constants.CKAN_TEST_ID);

    cy.reload();
    cy.goToIndices();
    cy.get('.mat-line').invoke('text').should('not.contain', 'ckan_test');
  });

  it('should find an harvester whose search is activated', () => {
    cy.activateToggleBar(constants.CKAN_DB_ID);
    cy.openAndImportHarvester(constants.CKAN_DB_ID);

    cy.goToIndices();
    cy.wait(500);
    cy.get('.mat-line').invoke('text').should('contain', 'ckan_db');
  });

  it('should show only one index per harvester', () => {
    cy.openAndImportHarvester(constants.CKAN_DB_ID);

    //wait for import to finish
    cy.wait(5000);

    cy.goToIndices();
    cy.get('.mat-line').then((allIndex) => {
      //remove index of given harvester
      const partialIndex = allIndex.text().replace('ckan_db', '');
      //index of the harvester should not be in the modified list of indices, unless it is present two times
      expect(partialIndex).not.contain('ckan_db');
      });
  });

  it('should delete an index if its harvester is deleted', () => {
    cy.get('.no-wrap').contains('csw_test_api').click();
    //import it to create index
    cy.get('[data-test="import"]:visible').click();
    //check index is created
    cy.goToIndices();
    cy.wait(500);
    cy.reload();
    cy.get('.mat-line').invoke('text').should('contain', 'csw_index');

    //delete
    cy.goToHarvester();
    cy.get('.no-wrap').contains('csw_test_api').click();
    cy.get('[data-test="delete"]:visible').click();
    cy.get('.mat-button-wrapper').contains('Löschen').click();

    cy.goToIndices();
    cy.wait(500);
    cy.reload();
    //index should be deleted
    cy.get('.mat-line').invoke('text').should('not.contain', 'csw_index');
  });
});
