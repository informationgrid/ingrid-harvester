import Authentication from '../../support/pageObjects/auth';
import Constants from '../../support/constants';
import HarvesterPage from '../../support/pageObjects/harvester/harvester';
import HarvesterForm from '../../support/pageObjects/harvester/harvesterForm';
import McloudHome from '../../support/pageObjects/mcloudHome';

describe('Ckan-Harvester operations', () => {
  const constants = new Constants();
  const auth = new Authentication();
  const harvester = new HarvesterPage();
  const form = new HarvesterForm();
  const mcloudPage = new McloudHome();

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
      defaultAttributionLink: 'attr_link',
      ckanBasisUrl: 'https://data.deutschebahn.com',
      defaultDCATCategory: 'Bevölkerung und Gesellschaft',
      defaultmCLOUDCategory: 'Bahn',
      maxRecords: '100',
      startPosition: '0'
    });

    cy.reload();
    harvester.deleteHarvesterById(constants.SEED_CKAN_ID);
  });

  it('should filter blacklisted IDs', () => {
    const toBlacklist = '7e526b8c-16bd-4f2c-a02b-8d4d0a29d310';
    const resultName = 'Ist-Verkehrsdaten der DB Cargo auf Bst8-Ebene';

    harvester.importHarvesterByIdAndWait(constants.CKAN_DB_ID);
    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(toBlacklist);
    mcloudPage.checkSearchResultsIncludeName(resultName, true);

    harvester.visit();
    harvester.openFormById(constants.CKAN_DB_ID);
    form.deleteListedIds(form.blacklistedId);
    form.deleteListedIds(form.whitelistedId);
    form.setFields({
      blacklistedId: toBlacklist
    });
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_DB_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(toBlacklist);
    mcloudPage.checkNoResults();

    harvester.visit();
    harvester.openFormById(constants.CKAN_DB_ID);
    form.deleteListedIds(form.blacklistedId);
    form.saveHarvesterConfig();
  });

  it('should exclude documents which have no data downloads (e.g. "rest")', () => {
    // example: CKAN-DB, "Muss Daten-Download enthalten": X, "Datenformat ausschließen": "rest"
    harvester.seedCkanHarvester(constants.SEED_CKAN_ID);
    harvester.openFormById(constants.SEED_CKAN_ID);
    form.activateContainsDataDownload();
    form.setFields({
      blacklistedDataFormat: 'rest'
    });
    form.saveHarvesterConfig();

    harvester.importHarvesterByIdAndWait(constants.SEED_CKAN_ID);

    const importedDocNumber = harvester.getDocNumber(constants.SEED_CKAN_ID);
    importedDocNumber.should('equal', '38');

    harvester.deleteHarvesterById(constants.SEED_CKAN_ID);
  });

  it('should import whitelisted IDs if excluded by no data downloads', () => {
    const toWhitelist = '7e526b8c-16bd-4f2c-a02b-8d4d0a29d310';
    const resultName = 'Ist-Verkehrsdaten der DB Cargo auf Bst8-Ebene';

    harvester.openFormById(constants.CKAN_DB_ID);
    form.deleteListedIds(form.blacklistedId);
    form.deleteListedIds(form.whitelistedId);
    form.activateContainsDataDownload();
    form.setFields({
      blacklistedDataFormat: 'rest'
    });
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_DB_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(toWhitelist);
    mcloudPage.checkNoResults();

    harvester.visit();
    harvester.openFormById(constants.CKAN_DB_ID);
    form.setFields({
      whitelistedId: toWhitelist
    });
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_DB_ID);
    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(toWhitelist);
    mcloudPage.checkSearchResultsIncludeName(resultName, true);

    harvester.visit();
    harvester.openFormById(constants.CKAN_DB_ID);
    form.deleteListedIds(form.whitelistedId);
    form.clearField(form.blacklistedDataFormat);
    form.deactivateContainsDataDownload();
    form.saveHarvesterConfig();
  });

  it('should import whitelisted IDs even if excluded by group', () => {
    const toWhitelist = 'a98ef34f-8f8e-487b-b2ea-b2ddb54a41de';
    const resultName = 'Ist-Verkehrsdaten der DB Cargo auf Bst8-Ebene';

    harvester.openFormById(constants.CKAN_DB_ID);
    form.setFields({
      filterGroups: 'apis'
    });
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_DB_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(toWhitelist);
    mcloudPage.checkNoResults();

    harvester.visit();
    harvester.openFormById(constants.CKAN_DB_ID);
    form.setFields({
      whitelistedId: toWhitelist
    });
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_DB_ID);
    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(toWhitelist);
    mcloudPage.checkSearchResultsIncludeName(resultName, true);

    harvester.visit();
    harvester.openFormById(constants.CKAN_DB_ID);
    form.deleteListedIds(form.whitelistedId);
    form.deleteListedIds(form.filterGroups);
    form.saveHarvesterConfig();
  });

  it('should import whitelisted IDs even if excluded by tag', () => {
    const toWhitelist = 'a98ef34f-8f8e-487b-b2ea-b2ddb54a41de';
    const resultName = 'Ist-Verkehrsdaten der DB Cargo auf Bst8-Ebene';

    harvester.openFormById(constants.CKAN_DB_ID);
    form.setFields({
      filterTag: 'Bahnhof'
    });
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_DB_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(toWhitelist);
    mcloudPage.checkNoResults();

    harvester.visit();
    harvester.openFormById(constants.CKAN_DB_ID);
    form.setFields({
      whitelistedId: toWhitelist
    });
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_DB_ID);
    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(toWhitelist);
    mcloudPage.checkSearchResultsIncludeName(resultName, true);

    harvester.visit();
    harvester.openFormById(constants.CKAN_DB_ID);
    form.deleteListedIds(form.whitelistedId);
    form.deleteListedIds(form.filterTag);
    form.saveHarvesterConfig();
  });
});
