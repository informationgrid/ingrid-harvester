describe('Excel-Harvester operations', () => {
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
    cy.reload();
    cy.restoreLocalStorageCache();
    Cypress.Cookies.preserveOnce('connect.sid');
  });

  afterEach(() => {
    cy.saveLocalStorageCache();
  });

  it('should add a harvester of type EXCEL', () => {
    harvester.addNewHarvester();
    form.setFields({
      type: 'EXCEL',
      description: 'Excel partial opts Harvester',
      indexName: 'part_excel',
      excelFilePath: './data.xlsx'
    });
    form.saveHarvesterConfig();
    cy.wait(500);

    harvester.openFormByName('Excel partial opts Harvester');

    form.checkFields({
      description: 'Excel partial opts Harvester',
      indexName: 'part_excel',
      excelFilePath: './data.xlsx'
    });
    cy.reload();
    harvester.deleteHarvesterByName('Excel partial opts Harvester');
  });

  it('should add a new harvester of type Excel with all options', () => {
    harvester.addNewHarvester();
    form.setFields({
      type: 'EXCEL',
      description: 'Excel full opts Harvester',
      indexName: 'full_excel',
      excelFilePath: './data.xlsx',
      defaultDCATCategory: 'Bevölkerung und Gesellschaft',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: '100',
      defaultAttributionLink: '23',
    });
    form.saveHarvesterConfig();
    cy.wait(500);
    cy.reload();

    harvester.openFormByName('Excel full opts Harvester');
    form.checkFields({
      description: 'Excel full opts Harvester',
      indexName: 'full_excel',
      excelFilePath: './data.xlsx',
      defaultDCATCategory: 'Bevölkerung und Gesellschaft',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: '100',
      defaultAttributionLink: '23'
    });
    cy.reload();
    harvester.deleteHarvesterByName('Excel full opts Harvester');
  });

  it('should update a harvester of type Excel', () => {
    harvester.openFormByName('excel_test');
    form.setFields({
      description: 'excel_update',
      indexName: 'updated_ex_harvester',
      defaultDCATCategory: 'Wirtschaft und Finanzen',
      defaultAttribution: '7'
    });
    form.saveHarvesterConfig();
    cy.wait(500);
    cy.reload();

    harvester.openFormByName('excel_update');
    form.checkFields({
      description: 'excel_update',
      indexName: 'updated_ex_harvester',
      defaultDCATCategory: 'Wirtschaft und Finanzen',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: '7',
      excelFilePath: './test-data.xlsx',
      startPosition: '1',
      maxRecords: '50'
    });
  });
});
