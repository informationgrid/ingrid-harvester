describe('Ckan-Harvester operations', () => {
  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../../support/pageObjects/harvester/harvester");
  const hPage = new HarvesterPage();
  const HarvesterForm = require("../../support/pageObjects/harvester/harvesterForm");
  const hForm = new HarvesterForm();

  beforeEach(() => {
    auth.apiLoginWithUserCheck();
  });

  it('should add a harvester of type CKAN', () => {
    hPage.addNewHarvester();
    hForm.setFields({
      type: 'CKAN',
      description: 'Testing CKAN Harvester',
      indexName: 'ckan_index',
      ckanBasisUrl: 'testme'
    });
    hForm.saveHarvesterConfig();
    hPage.wait(500);

    hPage.openHarvesterByName('Testing CKAN Harvester');
    hForm.checkFields({
      description: 'Testing CKAN Harvester',
      indexName: 'ckan_index',
      ckanBasisUrl: 'testme'
    });

    hPage.reload();
    hPage.deleteHarvesterByName('Testing CKAN Harvester');
  });

  it('should add a harvester of type CKAN with all options', () => {
    hPage.addNewHarvester();
    hForm.setFields({
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
      filterGroup: 'ckan_test',
      dateFormat: 'YYYY-MM-DD',
      licenseId: '325',
      licenseTitle: 'titleID',
      licenseUrl: 'wwwdedede'
    });
    hForm.saveHarvesterConfig();
    hPage.wait(500);
    hPage.reload();

    hPage.openHarvesterByName('Testing full CKAN Harvester');
    hForm.checkFields({
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
      titleId: 'titleID',
      licenseUrl: 'wwwdedede'
    });

    hPage.reload();
    hPage.deleteHarvesterByName('Testing CKAN Harvester');
  });

  it('should update an existing CKAN harvester', () => {
    hPage.openHarvesterByName('ckan_test');

    hForm.setFields({
      description: 'ckan_updated',
      indexName: 'updated_ckan',
      defaultAttribution: 'ffm',
      filterTag: 'ckan_test1',
      filterGroups: 'ckan_test1',
      dateFormat: 'YYYY-MM-DD'
    });
    hForm.saveHarvesterConfig();
    hPage.wait(500);
    hPage.reload();

    hPage.openHarvesterByName('ckan_updated');
    hForm.checkFields({
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
});
