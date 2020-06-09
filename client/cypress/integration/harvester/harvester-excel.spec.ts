import Authentication from "../../support/pageObjects/auth";
import Constants from "../../support/constants";
import HarvesterPage from "../../support/pageObjects/harvester/harvester";
import HarvesterForm from "../../support/pageObjects/harvester/harvesterForm";

describe('Excel-Harvester operations', () => {
  const constants = new Constants();
  const auth = new Authentication();
  const harvester = new HarvesterPage();
  const form = new HarvesterForm();

  beforeEach(() => {
    auth.apiLogIn();
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
    harvester.seedExcelHarvester(constants.SEED_EXCEL_ID);

    harvester.openFormById(constants.SEED_EXCEL_ID);
    form.checkFields({
      description: 'excel_test_api',
      indexName: 'excel_index_api',
      defaultDCATCategory: 'Bevölkerung und Gesellschaft',
      defaultmCLOUDCategory: 'Bahn'
    });

    form.setFields({
      description: 'excel_updated',
      indexName: 'updated_ex_harvester',
      defaultDCATCategory: 'Wirtschaft und Finanzen',
      defaultAttribution: '7'
    });

    form.saveHarvesterConfig();
    cy.reload();

    harvester.openFormById(constants.SEED_EXCEL_ID);
    form.checkFields({
      description: 'excel_updated',
      indexName: 'updated_ex_harvester',
      defaultDCATCategory: 'Wirtschaft und Finanzen',
      defaultmCLOUDCategory: 'Bahn',
      defaultAttribution: '7',
      excelFilePath: './data.xlsx',
      startPosition: '1',
      maxRecords: '50'
    });
    form.closeFormWithoutSaving();

    harvester.deleteHarvesterById(constants.SEED_EXCEL_ID);
  });
});
