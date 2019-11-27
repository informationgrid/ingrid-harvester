describe('Excel-Harvester operations', () => {
  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../../support/pageObjects/harvester/harvester");
  const hPage = new HarvesterPage();
  const HarvesterForm = require("../../support/pageObjects/harvester/harvesterForm");
  const hForm = new HarvesterForm();

  beforeEach(() => {
    auth.apiLoginWithUserCheck();
    // cy.seedExcelHarvester();
  });

  it('should add a harvester of type EXCEL', () => {
    hPage.addNewHarvester();
    hForm.setFields({
      type: 'EXCEL',
      description: 'Excel partial opts Harvester',
      indexName: 'excel_index',
      excelFilePath: './data.xlsx'
    });
    hForm.saveHarvesterConfig();
    hPage.wait(500);

    hPage.openHarvesterByName('Excel partial opts Harvester');

    hForm.checkFields({
      description: 'Excel partial opts Harvester',
      indexName: 'excel_index',
      excelFilePath: './data.xlsx'
    });
    hPage.reload();
    hPage.deleteHarvesterByName('Excel partial opts Harvester');
  });

  it('should add a new harvester of type Excel with all options', () => {
    hPage.addNewHarvester();
    hForm.setFields({
      type: 'EXCEL',
      description: 'Excel full opts Harvester',
      indexName: 'full_excel_index',
      excelFilePath: './data.xlsx',
      defaultDCATCategory: 'Bevölkerung und Gesellschaft',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: '100',
      defaultAttributionLink: '23',
    });
    hForm.saveHarvesterConfig();
    hPage.wait(500);
    hPage.reload();

    hPage.openHarvesterByName('Excel full opts Harvester');
    hForm.checkFields({
      description: 'Excel full opts Harvester',
      indexName: 'full_excel_index',
      excelFilePath: './data.xlsx',
      defaultDCATCategory: 'Bevölkerung und Gesellschaft',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: '100',
      defaultAttributionLink: '23'
    });
    hPage.reload();
    hPage.deleteHarvesterByName('Excel full opts Harvester');
  });

  it('should update a harvester of type Excel', () => {
    hPage.openHarvesterByName('excel_test_api');
    hForm.setFields({
      description: 'excel_update',
      indexName: 'update_excel_harvester',
      defaultDCATCategory: 'Wirtschaft und Finanzen',
      defaultAttribution: '7'
    });
    hForm.saveHarvesterConfig();
    hPage.wait(500);
    hPage.reload();

    hPage.openHarvesterByName('excel_update');
    hForm.checkFields({
      description: 'excel_update',
      indexName: 'update_excel_harvester',
      defaultDCATCategory: 'Wirtschaft und Finanzen',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: '7',
      excelFilePath: './data.xlsx',
      startPosition: '1',
      maxRecords: '50'
    });
    // hPage.reload();
    // hPage.deleteHarvesterByName('excel_update');
  });
});
