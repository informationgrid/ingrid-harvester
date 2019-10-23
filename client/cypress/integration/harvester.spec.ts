describe('Harvester operations', () => {
  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      //user is not already logged in send request to log in
      cy.apiLogin('admin', 'admin');
    }
  });

  //General options testing
  //button supposed to be disabled but it is not
  xit('cannot change type of a harvester during an update', () => {
    // not working
    cy.openHarvester('3');
    cy.get('[name=type]').should('be.disabled');
  });

  it('startPosition cannot be negative or a character', () => {
    //input control is needed
    cy.openHarvester('3');

    cy.setHarvesterFields({startPosition: 'ffm'});
    cy.get('[name=startPosition]').should('not.contain', 'ffm');

    cy.setHarvesterFields({startPosition: '-7'});

    cy.get('[name=startPosition]').invoke('val')
      .then((value) => {
        expect(value).to.be.greaterThan(-1);
      })
  });

  it('maxRecords cannot be negative or a character', () => {
    cy.openHarvester('3');

    cy.setHarvesterFields({maxRecords: 'ffm'});
    cy.get('[name=maxRecords]').should('contain', '');

    cy.setHarvesterFields({maxRecords: '-7'});

    cy.get('[name=maxRecords]').invoke('val')
      .then((value) => {
        expect(value).to.be.greaterThan(-1);
      })
  });

  //input control
  it('maxRecords and startPosition can have at most 4 digits', () => {
    cy.openHarvester('3');

    cy.setHarvesterFields({maxRecords: '1234567', startPosition: '1234567'});

    cy.get('[name=maxRecords]').should('contain', '1234');
    cy.get('[name=startPosition]').should('contain', '1234');
  });
});
