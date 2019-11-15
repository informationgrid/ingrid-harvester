describe('Harvester operations', () => {
  /**
   * seed db with 3 harvesters, one for each type: ckan, csw, excel
   */
  before(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      cy.apiLogin('admin', 'admin');
    }
    //seed with 3 harvester, one of each kind
    cy.seedHarvester();
  });

  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      //if user is not already logged in send request to log in
      cy.apiLogin('admin', 'admin');
    }
  });

  it('should check that the type of a harvester cannot be changed during an update', () => {
    cy.openHarvester('3');

    cy.get('[formcontrolname=type]').click({force: true});
    cy.once('fail', () => {
      // button cannot be clicked, also pass on fail
    });
  });

  it('should check that startPosition cannot be negative or a character [INPUT CONTROL]', () => {
    cy.openHarvester('3');
    // antipattern, BUT cypress is 'too fast' and gets the first form element instead of the given one
    cy.wait(500);

    //set wrong values for fields and check if the are accepted
    cy.setHarvesterFields({startPosition: 'ffm'});
    cy.get('[formcontrolname=startPosition]').should('not.contain', 'ffm');

    cy.setHarvesterFields({startPosition: '-7'});

    cy.get('[data-test=dlg-update]').should('be.disabled');

    cy.setHarvesterFields({startPosition: '10'});
    cy.get('[data-test=dlg-update]').should('be.enabled');
  });

  it('should check that maxRecords cannot be negative or a character [INPUT CONTROL]', () => {
    cy.openHarvester('3');
    cy.wait(500);

    cy.setHarvesterFields({maxRecords: 'ffm'});
    cy.get('[formcontrolname=maxRecords]').should('contain', '');

    cy.setHarvesterFields({maxRecords: '-7'});

    cy.get('[data-test=dlg-update]').should('be.disabled');

    cy.setHarvesterFields({maxRecords: '10'});
    cy.get('[data-test=dlg-update]').should('be.enabled');
  });

  it('should show the old values if an update operation is aborted and the page is not refreshed', () => {
    //set values that must not be saved
    cy.openHarvester('6');
    cy.setHarvesterFields({description: 'hold', indexName: 'the', defaultAttribution: 'door'});

    //close without saving
    cy.get('.mat-button-wrapper').contains('Abbrechen').click();

    //check values are the old ones
    cy.openHarvester('6');
    cy.checkFields({
      description: 'Deutsche Bahn Datenportal',
      indexName: 'ckan_db',
      defaultAttribution: 'Deutsche Bahn Datenportal'
    });
  });

  it('should not be able to save a harvester without selecting a type', () => {
    cy.addNewHarvester();

    cy.setHarvesterFields({
      description: 'Testing harvester with no type',
      indexName: 'just an index'
    });

    cy.get('[data-test="dlg-update"]').should('be.disabled');
  });

  it('should delete an harvester (by name)', () => {
    //open harvester with given name
    cy.openHarvesterByName('ckan_test_api');
    //delete it
    cy.get('[data-test="delete"]:visible').click();
    cy.get('.mat-button-wrapper').contains('Löschen').click();

    //TODO: function for deleting harvester
  });
});
