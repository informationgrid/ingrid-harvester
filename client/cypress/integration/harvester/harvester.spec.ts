describe('Harvester operations', () => {
  let Constants = require("../../support/constants");
  const constants = new Constants();

  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../../support/pageObjects/harvester/harvester");
  const harvester = new HarvesterPage();
  const HarvesterForm = require("../../support/pageObjects/harvester/harvesterForm");
  const form = new HarvesterForm();

  beforeEach(() => {
    auth.apiLogIn();
  });

  it('should check that the type of a harvester cannot be changed during an update', () => {
    harvester.openFormById(constants.CKAN_TEST_ID);

    form.fieldIsDisabled(form.type);
  });

  it('should check that startPosition cannot be negative or a character', () => {
    harvester.openFormById(constants.CKAN_TEST_ID);
    cy.wait(500);

    form.setFields({startPosition: 'ffm'});
    form.fieldValueIsNot(form.startPosition, 'ffm');

    form.setFields({startPosition: '-7'});
    form.btnIsDisabled(form.saveHarvesterBtn);

    form.setFields({startPosition: '10'});
    form.btnIsEnabled(form.saveHarvesterBtn);
  });

  it('should check that maxRecords cannot be negative or a character', () => {
    harvester.openFormById(constants.CKAN_TEST_ID);
      cy.wait(500);

    form.setFields({maxRecords: 'ffm'});
    form.fieldValueIs(form.maxRecords, '');

    form.setFields({maxRecords: '-7'});
    form.btnIsDisabled(form.saveHarvesterBtn);

    form.setFields({maxRecords: '10'});
    form.btnIsEnabled(form.saveHarvesterBtn);
  });

  it('should show the old values if an update operation is aborted and the page is not refreshed', () => {
    harvester.openFormById(constants.CKAN_DB_ID);
    form.setFields({description: 'hold', indexName: 'the', defaultAttribution: 'door'});

    form.closeFormWithoutSaving();

    harvester.openFormById(constants.CKAN_DB_ID);
    form.checkFields({
      description: 'Deutsche Bahn Datenportal',
      indexName: 'ckan_db',
      defaultAttribution: 'Deutsche Bahn Datenportal'
    });
  });

  it('should not be able to save a harvester without selecting a type', () => {
    harvester.addNewHarvester();
    form.setFields({
      description: 'Testing harvester with no type',
      indexName: 'just an index'
    });

    form.btnIsDisabled(form.saveHarvesterBtn);
  });

  it('should delete an harvester', () => {
    harvester.seedExcelHarvester(constants.SEED_EXCEL_ID);
    cy.reload();
    harvester.deleteHarvesterById(constants.SEED_EXCEL_ID);

    cy.get('.no-wrap').should('not.contain', 'excel_test_api');
  });
});
