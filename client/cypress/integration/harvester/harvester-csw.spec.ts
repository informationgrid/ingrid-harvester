describe('Csw-Harvester operations', () => {
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
    harvester.seedCswHarvester(constants.SEED_CSW_ID);
    cy.reload();

    harvester.openFormById(constants.SEED_CSW_ID);
    form.checkFields({
      description: 'csw_test_api',
      defaultDCATCategory: 'Bevölkerung und Gesellschaft',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: 'attr_name',
    });

    form.setFields({
      description: 'csw_updated',
      defaultDCATCategory: 'Verkehr',
      defaultmCLOUDCategory: 'Infrastruktur',
      defaultAttribution: 'ffm'
    });
    form.saveHarvesterConfig();
    cy.reload();

    harvester.openFormById(constants.SEED_CSW_ID);
    form.checkFields({
      description: 'csw_updated',
      defaultDCATCategory: 'Verkehr',
      defaultmCLOUDCategory: 'Infrastruktur',
      defaultAttribution: 'ffm'
    });

    cy.reload();
    harvester.deleteHarvesterById(constants.SEED_CSW_ID);
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
