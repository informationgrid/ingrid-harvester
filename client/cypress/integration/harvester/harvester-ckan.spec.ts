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
    const toBlacklist = 'a5750db7-c714-4903-b4f0-67ce57597a43';
    const resultName = 'Daten VVS';

    harvester.openFormById(constants.CKAN_MOBIDATA_BW_ID);
    form.cleanFilterAndRules();
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_MOBIDATA_BW_ID);
    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(toBlacklist);
    mcloudPage.checkSearchResultsIncludeName(resultName, true);

    harvester.visit();
    harvester.openFormById(constants.CKAN_MOBIDATA_BW_ID);
    form.setFields({
      blacklistedId: toBlacklist
    });
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_MOBIDATA_BW_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(toBlacklist);
    mcloudPage.checkNoResults();
  });

  it('should exclude documents which have no data downloads (e.g. "rest")', () => {
    const docWithDownload = 'a5750db7-c714-4903-b4f0-67ce57597a43';
    const resultName = 'Daten VVS';

    harvester.openFormById(constants.CKAN_MOBIDATA_BW_ID);
    form.cleanFilterAndRules();
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_MOBIDATA_BW_ID);
    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(docWithDownload);
    mcloudPage.checkSearchResultsIncludeName(resultName, true);

    harvester.visit();
    harvester.openFormById(constants.CKAN_MOBIDATA_BW_ID);
    form.activateContainsDataDownload();
    form.setFields({
      blacklistedDataFormat: 'ZIP'
    });
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_MOBIDATA_BW_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(docWithDownload);
    mcloudPage.checkNoResults();
  });

  it('should import whitelisted IDs if excluded by no data downloads', () => {
    const toWhitelist = 'a5750db7-c714-4903-b4f0-67ce57597a43';
    const resultName = 'Daten VVS';

    harvester.openFormById(constants.CKAN_MOBIDATA_BW_ID);
    form.cleanFilterAndRules();
    form.activateContainsDataDownload();
    form.setFields({
      blacklistedDataFormat: 'ZIP'
    });
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_MOBIDATA_BW_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(toWhitelist);
    mcloudPage.checkNoResults();

    harvester.visit();
    harvester.openFormById(constants.CKAN_MOBIDATA_BW_ID);
    form.setFields({
      whitelistedId: toWhitelist
    });
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_MOBIDATA_BW_ID);
    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(toWhitelist);
    mcloudPage.checkSearchResultsIncludeName(resultName, true);
  });

  it('should import whitelisted IDs even if excluded by group', () => {
    const toWhitelist = '2521be73-84f3-441c-9134-abbad67f9e93';
    const resultName = 'Ladesäulen im öffentlichen und halböffentlichen Raum';

    harvester.openFormById(constants.CKAN_BERLIN_ID);
    form.cleanFilterAndRules();
    form.setFields({
      filterGroups: 'geo'
    });
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_BERLIN_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(toWhitelist);
    mcloudPage.checkNoResults();

    harvester.visit();
    harvester.openFormById(constants.CKAN_BERLIN_ID);
    form.setFields({
      whitelistedId: toWhitelist
    });
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_BERLIN_ID);
    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(toWhitelist);
    mcloudPage.checkSearchResultsIncludeName(resultName, true);
  });

  it('should import whitelisted IDs even if excluded by tag', () => {
    const toWhitelist = 'a5750db7-c714-4903-b4f0-67ce57597a43';
    const resultName = 'Daten VVS';

    harvester.openFormById(constants.CKAN_MOBIDATA_BW_ID);
    form.cleanFilterAndRules();
    form.setFields({
      filterTag: 'Bahnhof'
    });
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_MOBIDATA_BW_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(toWhitelist);
    mcloudPage.checkNoResults();

    harvester.visit();
    harvester.openFormById(constants.CKAN_MOBIDATA_BW_ID);
    form.setFields({
      whitelistedId: toWhitelist
    });
    form.saveHarvesterConfig();
    harvester.importHarvesterByIdAndWait(constants.CKAN_MOBIDATA_BW_ID);
    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchForId(toWhitelist);
    mcloudPage.checkSearchResultsIncludeName(resultName, true);
  });
});
