describe('Harvester operations', () => {
  let Constants = require("../../support/constants");
  const constants = new Constants();

  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../../support/pageObjects/harvester/harvester");
  const hPage = new HarvesterPage();
  const HarvesterForm = require("../../support/pageObjects/harvester/harvesterForm");
  const hForm = new HarvesterForm();

  beforeEach(() => {
    auth.apiLoginWithUserCheck();
  });

  it('should check that the type of a harvester cannot be changed during an update', () => {
    hPage.openFormById(constants.CKAN_TEST_ID);

    hForm.fieldIsDisabled(hForm.type);
  });

  it('should check that startPosition cannot be negative or a character [INPUT CONTROL]', () => {
    hPage.openFormById(constants.CKAN_TEST_ID);
    hPage.wait(500);

    hForm.setFields({startPosition: 'ffm'});
    hForm.fieldContains(hForm.startPos, 'ffm', false);

    hForm.setFields({startPosition: '-7'});
    hForm.btnIsEnabled(hForm.saveHarvesterBtn, false);

    hForm.setFields({startPosition: '10'});
    hForm.btnIsEnabled(hForm.saveHarvesterBtn, true);
  });

  it('should check that maxRecords cannot be negative or a character [INPUT CONTROL]', () => {
    hPage.openFormById(constants.CKAN_TEST_ID);
    hPage.wait(500);

    hForm.setFields({maxRecords: 'ffm'});
    hForm.fieldContains(hForm.maxRecords, '', true);

    hForm.setFields({maxRecords: '-7'});
    hForm.btnIsEnabled(hForm.saveHarvesterBtn, false);

    hForm.setFields({maxRecords: '10'});
    hForm.btnIsEnabled(hForm.saveHarvesterBtn, true);
  });

  it('should show the old values if an update operation is aborted and the page is not refreshed', () => {
    hPage.openFormById(constants.CKAN_DB_ID);
    hForm.setFields({description: 'hold', indexName: 'the', defaultAttribution: 'door'});

    hForm.closeFormWithoutSaving();

    hPage.openFormById(constants.CKAN_DB_ID);
    hForm.checkFields({
      description: 'Deutsche Bahn Datenportal',
      indexName: 'ckan_db',
      defaultAttribution: 'Deutsche Bahn Datenportal'
    });
  });

  it('should not be able to save a harvester without selecting a type', () => {
    hPage.addNewHarvester();
    hForm.setFields({
      description: 'Testing harvester with no type',
      indexName: 'just an index'
    });

    hForm.btnIsEnabled(hForm.saveHarvesterBtn, false);
  });

  it('should delete an harvester (by name)', () => {
    hPage.deleteHarvesterByName('DWD');
  });

});
