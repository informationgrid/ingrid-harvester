import Authentication from '../../support/pageObjects/auth';
import Constants from '../../support/constants';
import HarvesterPage from '../../support/pageObjects/harvester/harvester';

describe('Import cron pattern operations', () => {
  const constants = new Constants();
  const auth = new Authentication();
  const harvester = new HarvesterPage();
  const dayjs = require('dayjs');
  const customParseFormat = require('dayjs/plugin/customParseFormat');
  dayjs.extend(customParseFormat);

  beforeEach(() => {
    auth.apiLogIn();
  });

  it('should plan an import, activate the auto-planning, check its execution and turn off the auto-planning', () => {
    harvester.activateForSearch(constants.CKAN_RNV_ID);
    harvester.toggleHarvesterById(constants.CKAN_RNV_ID);
    harvester.openScheduleDialog(constants.CKAN_RNV_ID);
    cy.wait(500);
    harvester.setCronPatternTo('* * * * *');
    harvester.activateScheduler();
    harvester.applyScheduleDialog();

    cy.get('#harvester-' + constants.CKAN_RNV_ID + ' ' + harvester.nextExecution, {timeout: 15000}).scrollIntoView();
    const nextImport = dayjs().add(1, 'minute').format('DD.MM.YY, HH:mm');
    harvester.checkFieldValueIs(constants.CKAN_RNV_ID, harvester.nextExecution, nextImport);

    // turn off auto planning
    harvester.openScheduleDialog(constants.CKAN_RNV_ID);
    harvester.deactivateScheduler();
    harvester.applyScheduleDialog();
  });

  it('should reset cron expression if the input clear button is pressed', () => {
    // TODO: to check again, button is as now not deactivated if an empty schedule is given

    harvester.toggleHarvesterById(constants.CKAN_DB_ID);
    harvester.openScheduleDialog(constants.CKAN_DB_ID);
    harvester.setCronPatternTo('* * * * *');
    harvester.deactivateScheduler();
    harvester.clickCronResetBtn();
    harvester.activateScheduler();
    cy.get(harvester.setScheduleBtn).should('be.disabled');
  });

  it('should show cron pattern´s syntax examples when the info button in the planning page is pressed', () => {
    harvester.toggleHarvesterById(constants.CKAN_DB_ID);
    harvester.openScheduleDialog(constants.CKAN_DB_ID);

    cy.get('.info').should('not.exist');

    cy.get(harvester.cronInfo).click();

    cy.get('.info').should('contain', 'Täglich um 8:45 Uhr');
  });

  it('should not import if the schedule is planned but off', () => {
    harvester.toggleHarvesterById(constants.CKAN_RNV_ID);
    harvester.openScheduleDialog(constants.CKAN_RNV_ID);
    harvester.setCronPatternTo('* * * * *');
    harvester.deactivateScheduler();
    harvester.applyScheduleDialog();

    harvester.checkFieldValueIs(constants.CKAN_RNV_ID, harvester.nextExecution, 'deaktiviert');

    const nextImport = dayjs().add(1, 'minute').format('DD.MM.YY, HH:mm');

    cy.wait(65000);
    cy.get('#harvester-' + constants.CKAN_RNV_ID + ' ' + harvester.lastExecution).scrollIntoView();
    harvester.checkFieldValueIsNot(constants.CKAN_RNV_ID, harvester.lastExecution, nextImport);
  });

  it('should disable scheduling for a harvester', () => {
    harvester.toggleHarvesterById(constants.CKAN_GEONET_ID);
    harvester.openScheduleDialog(constants.CKAN_GEONET_ID);
    harvester.deactivateScheduler();
    harvester.applyScheduleDialog();

    harvester.checkFieldValueIs(constants.CKAN_GEONET_ID, harvester.nextExecution, 'deaktiviert');
  });
});
