import Authentication from '../../support/pageObjects/auth';
import Constants from '../../support/constants';
import HarvesterPage from '../../support/pageObjects/harvester/harvester';
import HarvesterForm from '../../support/pageObjects/harvester/harvesterForm';

describe('Csw-Harvester operations', () => {
  const constants = new Constants();
  const auth = new Authentication();
  const harvester = new HarvesterPage();
  const form = new HarvesterForm();
  const dayjs = require('dayjs');
  const customParseFormat = require('dayjs/plugin/customParseFormat');
  dayjs.extend(customParseFormat);

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
    harvester.openFormById(constants.CSW_WSV_ID);
    form.clearField(form.recordFilter);
    form.saveHarvesterConfig();

    harvester.importHarvesterById(constants.CSW_WSV_ID);
    harvester.checkImportHasStarted();

    harvester.checkFieldValueIs(constants.CSW_WSV_ID, harvester.lastExecution, dayjs().format('DD.MM.YY, HH:mm'));
  });
});
