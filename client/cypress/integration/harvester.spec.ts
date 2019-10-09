/**
 * press button for adding a new harvester
 */
function addNewHarvester() {
  cy.get('#btnAddHarvester').click()
}

/**
 * press button for opening an existing harvester with given ID and updates it
 */
function openHarvester(harvesterId) {
  cy.get('#harvester-' + harvesterId).click();
  // cy.get('#harvester-' + harvesterId).click();
  cy.get('[data-test="edit"]').filter(':visible').click();
}

/**
 * press button for harvester update
 */
function saveHarvesterConfig() {
  cy.get('.mat-button').contains('Anlegen').click();
}

/**
 * press button to update an old harvester
 */
function updateHarvester() {
  cy.get('.mat-button').contains('Aktualisieren').click();
}

describe('TEST HARVESTER OPERATIONS', () => {
  beforeEach(() => {
    if(window.localStorage.getItem('currentUser') !== 'undefined'){
      //user is not already logged in send request to log in
      cy.apiLogin('admin', 'admin');
    }
  });

  it('add a harvester of type CKAN', () => {
    addNewHarvester();
    cy.newCkanHarvester({
      description: 'Testing CKAN Harvester',
      indexName: 'Testing CKAN Harvester',
      ckanBasisUrl: 'testme'
    });
    saveHarvesterConfig()
  });

  //TODO cant add csw url if type is not given
  xit('add a harvester of type CSW', () => {
    addNewHarvester();
    cy.newCswHarvester({
      description: 'Testing CSW Harvester',
      indexName: 'Testing CSW Harvester',
      httpMethod: 'GET',
      getRecordsUrl: './testme'
    });
    saveHarvesterConfig();
  });

  xit('add a harvester of type EXCEL', () => {
    addNewHarvester();
    cy.newExcelHarvester({
      description: 'Testing Excel Harvester',
      indexName: 'Testing Excel Harvester',
      path: './data.xlsx'
    });
    saveHarvesterConfig();
  });

  it('add a new harvester of type Excel with all options', () => {
    addNewHarvester();
    cy.newExcelHarvester({
      description: 'Testing Excel Harvester',
      indexName: 'Testing Excel Harvester',
      path: './data.xlsx',
      defaultDCATCategory: 'Bevölkerung und Gesellschaft',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: '100',
      defaultAttributionLink: '23',
      maxRecords: 'capa'
    });
    saveHarvesterConfig();
  });

  it('update a harvester of type CKAN', () => {
    openHarvester('42');

    //if dcatCategory value to input already selected then deselect it
    cy.get('[name=defaultDCATCategory]')
      .then((dcatCat) => {
        if(dcatCat.text().includes('Energie')){
          cy.get('[name="defaultDCATCategory"]').click();
          cy.get('.mat-option-text').contains('Energie').click();
          cy.get('[name="defaultDCATCategory"]').type('{esc}');
        }
      });
    //if mcloudCategory value to input already selected then deselect it
    cy.get('[name=defaultmCLOUDCategory]')
      .then((mcloudCat) => {
        if(mcloudCat.text().includes('Infrastruktur')){
          cy.get('[name="defaultmCLOUDCategory"]').click();
          cy.get('.mat-option-text').contains('Infrastruktur').click();
          cy.get('[name="defaultmCLOUDCategory"]').type('{esc}');
        }
      });

    cy.setHarvesterFields({
      indexName: 'Testing update ckan Harvester',
      defaultDCATCategory: 'Energie', //elements must not be already selected
      defaultmCLOUDCategory: 'Infrastruktur',
      defaultAttribution: '1'
    });
    updateHarvester();
    cy.reload();
    //checks data was saved
    openHarvester('42');
    cy.get('[name="defaultDCATCategory"]').should('contain', 'Energie');
    cy.get('[name="defaultmCLOUDCategory"]').should('contain', 'Infrastruktur');
    cy.get('[name="defaultAttribution"]').should('have.value', '1');
  });

  xit('update a harvester of type CSW', () => {
  });
  xit('update a harvester of type Excel', () => {
  });

  //button supposed to be disable but it is not
  xit('cannot change type during an update', () => {
    // not working
    openHarvester('42');
    cy.get('[name=type]').should('be.disabled');
  });

  //TODO implement input control.
  it('startPosition cannot be negative or a character', () => {
    openHarvester('42');

    cy.setHarvesterFields({startPosition: 'ffm'});
    cy.get('[name=startPosition]').should('not.contain', 'ffm');

    // cy.setHarvesterFields({startPosition: '0'});
    // cy.get('[name=startPosition]').focus();
    // cy.get('[name=startPosition]').click();
    cy.setHarvesterFields({startPosition: '-7'});

    cy.get('[name=startPosition]').invoke('val')
      .then((value)=> {
        expect(value).to.be.greaterThan(-1);
      })
  });

  it('maxRecords cannot be negative or a character', () => {
    openHarvester('42');

    cy.setHarvesterFields({maxRecords: 'ffm'});
    cy.get('[name=maxRecords]').should('contain', '');

    cy.setHarvesterFields({maxRecords: '-7'});

    cy.get('[name=maxRecords]').invoke('val')
      .then((value)=> {
        expect(value).to.be.greaterThan(-1);
      })
  });

  //TODO to implement
  it('maxRecords and startPosition can have at most 4 digits', () => {
    openHarvester('42');

    cy.setHarvesterFields({maxRecords: '1234567', startPosition: '1234567'});

    cy.get('[name=maxRecords]').should('contain', '1234');
    cy.get('[name=startPosition]').should('contain', '1234');
  });
});
