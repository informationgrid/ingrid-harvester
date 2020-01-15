describe('Ckan-Harvester operations', () => {
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

  it('should add a harvester of type CKAN', () => {
    harvester.addNewHarvester();
    form.setFields({
      type: 'CKAN',
      description: 'Testing CKAN Harvester',
      indexName: 'ckan_index',
      ckanBasisUrl: 'testme'
    });
    form.saveHarvesterConfig();
    cy.reload();

    harvester.openFormByName('Testing CKAN Harvester');
    form.checkFields({
      description: 'Testing CKAN Harvester',
      indexName: 'ckan_index',
      ckanBasisUrl: 'testme'
    });

    cy.reload();
    harvester.deleteHarvesterByName('Testing CKAN Harvester');
  });

  it('should add a harvester of type CKAN with all options', () => {
    harvester.addNewHarvester();
    form.setFields({
      type: 'CKAN',
      description: 'Testing full CKAN Harvester',
      indexName: 'full_ckan_indice',
      ckanBasisUrl: 'test me',
      defaultDCATCategory: 'Bevölkerung und Gesellschaft',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: 'Offene Testdaten',
      defaultAttributionLink: 'AttributionLink',
      maxRecords: '10',
      startPosition: '1',
      filterTag: 'ckan_test',
      filterGroups: 'ckan_test',
      dateFormat: 'YYYY-MM-DD',
      licenseId: '325',
      licenseTitle: 'titleID',
      licenseUrl: 'wwwdedede'
    });
    form.saveHarvesterConfig();
    cy.reload();

    harvester.openFormByName('Testing full CKAN Harvester');
    form.checkFields({
      description: 'Testing full CKAN Harvester',
      indexName: 'full_ckan_indice',
      ckanBasisUrl: 'test me',
      defaultDCATCategory: 'Bevölkerung und Gesellschaft',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: 'Offene Testdaten',
      defaultAttributionLink: 'AttributionLink',
      maxRecords: '10',
      startPosition: '1',
      licenseId: '325',
      licenseTitle: 'titleID',
      licenseUrl: 'wwwdedede'
    });

    cy.reload();
    harvester.deleteHarvesterByName('Testing full CKAN Harvester');
  });

  it('should update an existing CKAN harvester', () => {
    harvester.seedCkanHarvester(constants.SEED_CKAN_ID);

    harvester.openFormById(constants.SEED_CKAN_ID);
    form.checkFields(
      {
        description: 'ckan_test_api',
        indexName: 'ckan_api_index',
        defaultAttribution: 'attr_name',
      });

    form.setFields({
      description: 'ckan_updated',
      indexName: 'updated_ckan',
      defaultAttribution: 'ffm',
      dateFormat: 'YYYY-MM-DD'
    });
    form.saveHarvesterConfig();
    cy.reload();

    harvester.openFormById(constants.SEED_CKAN_ID);
    form.checkFields({
      indexName: 'updated_ckan',
      defaultAttribution: 'ffm',
      defaultAttributionLink: "attr_link",
      ckanBasisUrl: './testme',
      defaultDCATCategory: 'Bevölkerung und Gesellschaft',
      defaultmCLOUDCategory: 'Bahn',
      maxRecords: '50',
      startPosition: '1'
    });

    cy.reload();
    harvester.deleteHarvesterById(constants.SEED_CKAN_ID);
  });

  it('should filter blacklisted IDs', () => {
    let toBlacklist = '7e526b8c-16bd-4f2c-a02b-8d4d0a29d310';

    harvester.openFormById(constants.CKAN_DB_ID);
    form.setFields({
      blacklistedId: toBlacklist
    });
    form.saveHarvesterConfig();

    harvester.importHarvesterById(constants.CKAN_DB_ID);
    harvester.waitForImportToFinish(constants.CKAN_DB_ID);

    let importedDocNumber = harvester.getDocNumber(constants.CKAN_DB_ID);
    importedDocNumber.should('equal', '41');

    harvester.openFormById(constants.CKAN_DB_ID);
    form.deleteListedIds(form.blacklistedId);
    form.saveHarvesterConfig();
  });

  it('should exclude documents which have no data downloads (e.g. "rest")', () => {
    // example: CKAN-DB, "Muss Daten-Download enthalten": X, "Datenformat ausschließen": "rest"
    harvester.openFormById(constants.CKAN_DB_ID);
    form.activateContainsDataDownload();
    form.setFields({
      blacklistedDataFormat: 'rest'
    });
    form.saveHarvesterConfig();

    harvester.importHarvesterById(constants.CKAN_DB_ID);
    harvester.waitForImportToFinish(constants.CKAN_DB_ID);

    let importedDocNumber = harvester.getDocNumber(constants.CKAN_DB_ID);
    importedDocNumber.should('be.below', '42');
    importedDocNumber.should('equal', '38');

    harvester.openFormById(constants.CKAN_DB_ID);
    form.deactivateContainsDataDownload();
    form.saveHarvesterConfig();

  });

  it('should not import whitelisted IDs if excluded by no data downloads', () => {
    let toWhitelist = '7e526b8c-16bd-4f2c-a02b-8d4d0a29d310';

    harvester.openFormById(constants.CKAN_DB_ID);
    form.activateContainsDataDownload();
    form.setFields({
      whitelistedId: toWhitelist,
      blacklistedDataFormat: 'rest'
    });
    form.saveHarvesterConfig();

    harvester.importHarvesterById(constants.CKAN_DB_ID);
    harvester.waitForImportToFinish(constants.CKAN_DB_ID);

    let importedDocNumber = harvester.getDocNumber(constants.CKAN_DB_ID);
    importedDocNumber.should('equal', '38');

    harvester.openFormById(constants.CKAN_DB_ID);
    form.deleteListedIds(form.whitelistedId);
    form.deactivateContainsDataDownload();
    form.saveHarvesterConfig();
  });

  it('should import whitelisted IDs even if excluded by tag or group', () => {
    let toWhitelist = 'a98ef34f-8f8e-487b-b2ea-b2ddb54a41de';

    harvester.openFormById(constants.CKAN_DB_ID);
    form.setFields({
      whitelistedId: toWhitelist,
      filterGroups: 'Datensätze'
    });
    form.saveHarvesterConfig();

    harvester.importHarvesterById(constants.CKAN_DB_ID);
    harvester.waitForImportToFinish(constants.CKAN_DB_ID);

    let importedDocNumber = harvester.getDocNumber(constants.CKAN_DB_ID);
    importedDocNumber.should('equal', '1');

    harvester.openFormById(constants.CKAN_DB_ID);
    form.deleteListedIds(form.whitelistedId);
    form.deleteListedIds(form.filterGroups);
    form.saveHarvesterConfig();
  });

});
