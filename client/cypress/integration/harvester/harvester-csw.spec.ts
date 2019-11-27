describe('Csw-Harvester operations', () => {
  let Constants = require("../../support/constants");
  const constants = new Constants();

  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../../support/pageObjects/harvester/harvester");
  const hPage = new HarvesterPage();
  const HarvesterForm = require("../../support/pageObjects/harvester/harvesterForm");
  const hForm = new HarvesterForm();


  // before(() => {
  //   cy.seedCswHarvester()
  // });

  beforeEach(() => {
    auth.apiLoginWithUserCheck();
  });

  it('should add a harvester of type CSW', () => {
    hPage.addNewHarvester();
    hForm.setFields({
      type: 'CSW',
      description: 'Testing partial CSW Harvester',
      indexName: 'csw_index',
      httpMethod: 'GET',
      getRecordsUrl: './testme'
    });
    hForm.saveHarvesterConfig();
    hPage.wait(500);

    hPage.openHarvesterByName('Testing partial CSW Harvester');
    hForm.checkFields({
      description: 'Testing partial CSW Harvester',
      indexName: 'csw_index',
      httpMethod: 'GET',
      getRecordsUrl: './testme'
    });

    hPage.reload();
    hPage.deleteHarvesterByName('Testing partial CSW Harvester');
  });

  it('should add a new harvester of type CSW with all options', () => {
    hPage.addNewHarvester();
    hForm.setFields({
      type: 'CSW',
      description: 'Testing CSW Harvester',
      indexName: 'full_csw_index',
      httpMethod: 'POST',
      getRecordsUrl: './testme',
      defaultDCATCategory: 'Wissenschaft und Technologie',
      defaultmCLOUDCategory: 'Straßen',
      defaultAttribution: 'testing_csw',
      defaultAttributionLink: 'https://sike.fake',
      maxRecords: '50',
      startPosition: '0',
      recordFilter: 'opendata',
      keywords: 'this_is_a_test'
    });
    hForm.saveHarvesterConfig();
    hPage.wait(500);
    hPage.reload();

    hPage.openHarvesterByName('Testing CSW Harvester');
    hForm.checkFields({
      description: 'Testing CSW Harvester',
      indexName: 'full_csw_index',
      httpMethod: 'POST',
      getRecordsUrl: './testme',
      defaultDCATCategory: 'Wissenschaft und Technologie',
      defaultmCLOUDCategory: 'Straßen',
      defaultAttribution: 'testing_csw',
      defaultAttributionLink: 'https://sike.fake',
      maxRecords: '50',
      startPosition: '0'
    });

    hPage.reload();
    hPage.deleteHarvesterByName('Testing CSW Harvester');
  });

  it('should update a harvester of type CSW', () => {
    hPage.openHarvesterByName('csw_test_api');

    hForm.setFields({
      description: 'csw_update',
      indexName: 'full_csw_index',
      defaultDCATCategory: 'Verkehr',
      defaultmCLOUDCategory: 'Infrastruktur',
      defaultAttribution: 'ffm'
    });
    hForm.saveHarvesterConfig();
    hPage.wait(500);
    hPage.reload();

    hPage.openHarvesterByName('csw_update');
    hForm.checkFields({
      description: 'csw_update',
      indexName: 'full_csw_index',
      defaultDCATCategory: 'Verkehr',
      defaultmCLOUDCategory: 'Infrastruktur',
      defaultAttribution: 'ffm'
    });

    // hPage.reload();
    // hPage.deleteHarvesterByName('csw_update');
  });

  it('should successfully harvest after deleting an existing filter-label', () => {
    hPage.openFormById(constants.CSW_CODEDE_ID);
    hPage.wait(500);

    hForm.clearFilterField();

    hForm.saveHarvesterConfig();
    hPage.wait(500);
    hPage.importHarvesterById(constants.CSW_CODEDE_ID);

    hPage.checkImportHasStarted();

    const importsDate = Cypress.moment().format('DD.MM.YY, HH:mm');
    hPage.checkImportDate(constants.CSW_CODEDE_ID, importsDate);
  });
});
