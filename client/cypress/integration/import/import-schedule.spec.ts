describe('Import cron pattern operations', () => {
  let Constants = require("../../support/constants");
  const constants = new Constants();

  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../../support/pageObjects/harvester/harvester");
  const harvester = new HarvesterPage();

  beforeEach(() => {
    auth.apiLoginWithUserCheck();
  });

  it('should plan an import, activate the auto-planning, check its execution and turn off the auto-planning', () => {
    harvester.toggleHarvesterById(constants.CKAN_DB_ID);
    harvester.openScheduleDialog(constants.CKAN_DB_ID);
    harvester.setCronPatternTo('* * * * *');
    harvester.activateScheduler();
    harvester.applyScheduleDialog();
    cy.reload();

    harvester.toggleHarvesterById(constants.CKAN_DB_ID);
    const nextImport = Cypress.moment(new Date(), 'DD.MM.YY, HH:mm').add(1, 'minute').format('DD.MM.YY, HH:mm');
    harvester.checkFieldValueIs(constants.CKAN_DB_ID, harvester.nextExecution, nextImport);

    // harvester.getHarvesterElement(constants.CKAN_DB_ID, harvester.lastExecution).should('contain', nextImport);
  });

  it('should reset cron expression if the input clear button is pressed', () => {
    //TODO: to check again, button is as now not deactivated if an empty schedule is given
    harvester.toggleHarvesterById(constants.CKAN_DB_ID);
    harvester.openScheduleDialog(constants.CKAN_DB_ID);
    harvester.setCronPatternTo('* * * * *');
    harvester.deactivateScheduler();
    harvester.clickCronResetBtn();

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
    harvester.toggleHarvesterById(constants.CKAN_DB_ID);
    harvester.openScheduleDialog(constants.CKAN_DB_ID);
    harvester.setCronPatternTo('* * * * *');
    harvester.deactivateScheduler();
    harvester.applyScheduleDialog();

    harvester.checkFieldValueIs(constants.CKAN_DB_ID, harvester.nextExecution,'deaktiviert');

    const importsDate = Cypress.moment().format('DD.MM.YY, HH:mm');
    const nextImport = Cypress.moment(importsDate, 'DD.MM.YY, HH:mm').add(1, 'minute').format('DD.MM.YY, HH:mm');

    cy.wait(65000);
    harvester.checkFieldValueIsNot(constants.CKAN_DB_ID, harvester.lastExecution, nextImport);
  });

  it('should disable scheduling for a harvester', () => {
    harvester.toggleHarvesterById(constants.CKAN_TEST_ID);
    harvester.openScheduleDialog(constants.CKAN_TEST_ID);
    harvester.deactivateScheduler();
    harvester.applyScheduleDialog();

    harvester.checkFieldValueIs(constants.CKAN_TEST_ID, harvester.nextExecution, 'deaktiviert');
  });
});
