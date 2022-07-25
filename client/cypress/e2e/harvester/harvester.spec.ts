import Authentication from '../../support/pageObjects/auth';
import Constants from '../../support/constants';
import HarvesterPage from '../../support/pageObjects/harvester/harvester';
import HarvesterForm from '../../support/pageObjects/harvester/harvesterForm';
import McloudHome from '../../support/pageObjects/mcloudHome';

describe('Harvester operations', () => {
  const constants = new Constants();
  const auth = new Authentication();
  const harvester = new HarvesterPage();
  const form = new HarvesterForm();
  const mcloudPage = new McloudHome();

  beforeEach(() => {
    auth.apiLogIn();
  });

  it('should check that the type of a harvester cannot be changed during an update', () => {
    harvester.openFormById(constants.CKAN_DB_ID);

    form.fieldIsDisabled(form.type);
  });

  it('should check that startPosition cannot be negative or a character', () => {
    harvester.openFormById(constants.CKAN_DB_ID);
    cy.wait(500);

    form.setFields({startPosition: 'ffm'});
    form.fieldValueIsNot(form.startPosition, 'ffm');

    form.setFields({startPosition: '-7'});
    form.btnIsDisabled(form.saveHarvesterBtn);

    form.setFields({startPosition: '10'});
    form.btnIsEnabled(form.saveHarvesterBtn);
  });

  it('should check that maxRecords cannot be negative or a character', () => {
    harvester.openFormById(constants.CKAN_DB_ID);
    cy.wait(500);

    form.setFields({maxRecords: 'ffm'});
    form.fieldValueIs(form.maxRecords, '');

    form.setFields({maxRecords: '-7'});
    form.btnIsDisabled(form.saveHarvesterBtn);

    form.setFields({maxRecords: '10'});
    form.btnIsEnabled(form.saveHarvesterBtn);
  });

  it('should show the old values if an update operation is aborted and the page is not refreshed', () => {
    harvester.openFormById(constants.CKAN_DB_ID);
    form.setFields({description: 'hold', indexName: 'the', defaultAttribution: 'door'});

    form.closeFormWithoutSaving();

    harvester.openFormById(constants.CKAN_DB_ID);
    form.checkFields({
      description: 'Deutsche Bahn Datenportal',
      indexName: 'ckan_db',
      defaultAttribution: 'Deutsche Bahn Datenportal'
    });
  });

  it('should not be able to save a harvester without selecting a type', () => {
    harvester.addNewHarvester();
    form.setFields({
      description: 'Testing harvester with no type',
      indexName: 'just an index'
    });

    form.btnIsDisabled(form.saveHarvesterBtn);
  });

  it('should delete a harvester', () => {
    harvester.seedExcelHarvester(constants.SEED_EXCEL_ID);

    harvester.deleteHarvesterById(constants.SEED_EXCEL_ID);
  });

  it('should find a harvester whose search is activated', () => {
    const docToFind = 'Fahrplandaten mit Linienverlauf';

    harvester.activateForSearch(constants.CKAN_MOBIDATA_BW_ID);
    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchFor(docToFind);

    mcloudPage.checkForResults();
  });

  it('should not find a harvester whose search is not activated', () => {
    const docToFind = 'Fahrplandaten mit Linienverlauf';

    harvester.deactivateForSearch(constants.CKAN_MOBIDATA_BW_ID);
    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchFor(docToFind);
    mcloudPage.checkNoResults();
  });
});
