describe('Csw-Harvester operations', () => {
  let Constants = require("../../support/constants");
  const constants = new Constants();

  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../../support/pageObjects/harvester/harvester");
  const harvester = new HarvesterPage();
  const HarvesterForm = require("../../support/pageObjects/harvester/harvesterForm");
  const form = new HarvesterForm();

  // before(() => {
  //   cy.seedCswHarvester()
  // });

  before(()=>{
    auth.apiLogIn();
  });

  beforeEach(() => {
    cy.restoreLocalStorageCache();
    Cypress.Cookies.preserveOnce('connect.sid');
  });

  afterEach(() => {
    cy.saveLocalStorageCache();
  });

  it('should add a harvester of type CSW', () => {
    harvester.addNewHarvester();
    form.setFields({
      type: 'CSW',
      description: 'Testing partial CSW Harvester',
      indexName: 'part_csw',
      httpMethod: 'GET',
      getRecordsUrl: './testme'
    });
    form.saveHarvesterConfig();
    cy.wait(500);
    cy.reload();

    harvester.openFormByName('Testing partial CSW Harvester');
    form.checkFields({
      description: 'Testing partial CSW Harvester',
      indexName: 'part_csw',
      httpMethod: 'GET',
      getRecordsUrl: './testme'
    });

    cy.reload();
    harvester.deleteHarvesterByName('Testing partial CSW Harvester');
  });

  it('should add a new harvester of type CSW with all options', () => {
    harvester.addNewHarvester();
    form.setFields({
      type: 'CSW',
      description: 'Testing CSW Harvester',
      indexName: 'full_csw',
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
    form.saveHarvesterConfig();
    cy.reload();

    harvester.openFormByName('Testing CSW Harvester');
    form.checkFields({
      description: 'Testing CSW Harvester',
      indexName: 'full_csw',
      httpMethod: 'POST',
      getRecordsUrl: './testme',
      defaultDCATCategory: 'Wissenschaft und Technologie',
      defaultmCLOUDCategory: 'Straßen',
      defaultAttribution: 'testing_csw',
      defaultAttributionLink: 'https://sike.fake',
      maxRecords: '50',
      startPosition: '0'
    });

    cy.reload();
    harvester.deleteHarvesterByName('Testing CSW Harvester');
  });

  it('should update a harvester of type CSW', () => {
    harvester.openFormById(constants.CSW_TEST_ID);
    form.setFields({
      description: 'csw_update',
      defaultDCATCategory: 'Verkehr',
      defaultmCLOUDCategory: 'Infrastruktur',
      defaultAttribution: 'ffm'
    });
    form.saveHarvesterConfig();
    cy.reload();

    harvester.openFormByName('csw_update');
    form.checkFields({
      description: 'csw_update',
      defaultDCATCategory: 'Verkehr',
      defaultmCLOUDCategory: 'Infrastruktur',
      defaultAttribution: 'ffm'
    });

    // hPage.reload();
    // hPage.deleteHarvesterByName('csw_update');
  });

  it('should successfully harvest after deleting an existing filter-label', () => {
    harvester.openFormById(constants.CSW_CODEDE_ID);

    form.clearFilterField();
    form.saveHarvesterConfig();

    harvester.importHarvesterById(constants.CSW_CODEDE_ID);
    harvester.checkImportHasStarted();

    const importsDate = Cypress.moment().format('DD.MM.YY, HH:mm');
    harvester.checkFieldValueIs(constants.CSW_CODEDE_ID, harvester.lastExecution, importsDate);
  });
});
