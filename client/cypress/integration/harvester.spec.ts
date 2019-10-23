describe('Harvester operations', () => {
  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      //user is not already logged in send request to log in
      cy.apiLogin('admin', 'admin');
    }
  });

  //CKAN Harvesters operations

/*  it('add a harvester of type CKAN', () => {
    addNewHarvester();
    cy.newCkanHarvester({
      description: 'Testing CKAN Harvester',
      indexName: 'Testing CKAN Harvester',
      ckanBasisUrl: 'testme'
    });
    saveHarvesterConfig();
  });*/

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
      indexName: 'Testing update ckan Harvester',
      defaultDCATCategory: 'Verkehr',
      defaultmCLOUDCategory: 'Infrastruktur',
      defaultAttribution: 'ffm'
    });
    cy.updateHarvester();
    cy.wait(3000);
    cy.reload();
    //checks data was saved
    cy.openHarvester('3');
    cy.get('[name=defaultDCATCategory]').should('contain', 'Verkehr');
    cy.get('[name=defaultmCLOUDCategory]').should('contain', 'Infrastruktur');
    cy.get('[name=defaultAttribution]').should('have.value', 'ffm');
  });

/*  //Excel Harvesters operations
  it('add a harvester of type EXCEL', () => {
    addNewHarvester();
    cy.newExcelHarvester({
      description: 'Testing Excel Harvester',
      indexName: 'Testing Excel Harvester',
      path: './data.xlsx'
    });
    saveHarvesterConfig();
  });*/

  it('add a new harvester of type Excel with all options', () => {
    cy.addNewHarvester();
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
    cy.saveHarvesterConfig();
  });

  it('update a harvester of type Excel', () => {
    cy.openHarvester('1');
    //if dcatCategory value to input already selected then deselect it
    cy.get('[name=defaultDCATCategory]')
      .then((dcatCat) => {
        if (dcatCat.text().includes('Wirtschaft und Finanzen')) {
          cy.get('[name=defaultDCATCategory]').click();
          cy.get('.mat-option-text').contains('Wirtschaft und Finanzen').click();
          cy.get('[name=defaultDCATCategory]').type('{esc}');
        }
      });
    //if mcloudCategory value to input already selected then deselect it
    cy.get('[name=defaultmCLOUDCategory]')
      .then((mcloudCat) => {
        if (mcloudCat.text().includes('Klima und Wetter')) {
          cy.get('[name=defaultmCLOUDCategory]').click();
          cy.get('.mat-option-text').contains('Klima und Wetter').click();
          cy.get('[name=defaultmCLOUDCategory]').type('{esc}');
        }
      });

    cy.setHarvesterFields({
      indexName: 'Testing update ckan Harvester',
      defaultDCATCategory: 'Wirtschaft und Finanzen',
      defaultmCLOUDCategory: 'Klima und Wetter',
      defaultAttribution: '7'
    });
    cy.updateHarvester();
    cy.reload();
    //checks data was saved
    cy.openHarvester('1');
    cy.get('[name=defaultDCATCategory]').should('contain', 'Wirtschaft und Finanzen');
    cy.get('[name=defaultmCLOUDCategory]').should('contain', 'Klima und Wetter');
    cy.get('[name=defaultAttribution]').should('have.value', '7');
  });

  //General options testing
  //button supposed to be disabled but it is not
  xit('cannot change type of a harvester during an update', () => {
    // not working
    cy.openHarvester('3');
    cy.get('[name=type]').should('be.disabled');
  });

  //TODO implement input control
  it('startPosition cannot be negative or a character', () => {
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
