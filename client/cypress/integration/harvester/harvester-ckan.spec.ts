describe('Ckan-Harvester operations', () => {
  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../../support/pageObjects/harvester/harvester");
  const harvester = new HarvesterPage();
  const HarvesterForm = require("../../support/pageObjects/harvester/harvesterForm");
  const form = new HarvesterForm();

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
    auth.apiLoginWithUserCheck();  //temporary workaround, test was always redirected to login-page

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
    harvester.openFormByName('ckan_test');
    form.setFields({
      description: 'ckan_updated',
      indexName: 'updated_ckan',
      defaultAttribution: 'ffm',
      filterTag: 'ckan_test1',
      filterGroups: 'ckan_test1',
      dateFormat: 'YYYY-MM-DD'
    });
    form.saveHarvesterConfig();
    cy.reload();

    harvester.openFormByName('ckan_updated');
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

    // hPage.reload();
    // hPage.deleteHarvesterByName('ckan_updated');
  });

  xit('should filter blacklisted IDs', function () {

  });

  xit('should exclude documents which have no data downloads (e.g. "rest")', function () {
    // example: CKAN-DB, "Muss Daten-Download enthalten": X, "Datenformat ausschließen": "rest"
  });

  xit('should import whitelisted IDs even if excluded by no data downloads', function () {
    // example: CKAN-DB, "Muss Daten-Download enthalten": X, "Datenformat ausschließen": "rest"
    //          "nicht auszuschließende IDs": "7e526b8c-16bd-4f2c-a02b-8d4d0a29d310"

  });

  xit('should import whitelisted IDs even if excluded by tag or group', function () {

  });

});
