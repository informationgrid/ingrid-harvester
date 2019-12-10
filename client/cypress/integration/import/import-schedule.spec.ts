describe('Import cron pattern operations', () => {
  let Constants = require("../../support/constants");
  const constants = new Constants();

  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../../support/pageObjects/harvester/harvester");
  const hPage = new HarvesterPage();

  beforeEach(() => {
    auth.apiLoginWithUserCheck();
  });

  it('should plan an import, activate the auto-planning, check its execution and turn off the auto-planning', () => {
    hPage.setScheduleTo(constants.CKAN_DB_ID, '* * * * *');
    hPage.reload();

    hPage.clickHarvesterById(constants.CKAN_DB_ID);
    const nextImport = Cypress.moment(new Date(), 'DD.MM.YY, HH:mm').add(1, 'minute').format('DD.MM.YY, HH:mm');
    hPage.nextExecutionContains(constants.CKAN_DB_ID, nextImport, true);

    cy.get('#harvester-' + constants.CKAN_DB_ID + ' [data-test="last-execution"]', {timeout: 65000}).should('contain', nextImport);
  });

  it('should reset cron expression if the input clear button is pressed', () => {
    hPage.setScheduleTo(constants.CKAN_DB_ID, '* * * * *');

    hPage.openScheduleDialog(constants.CKAN_DB_ID);
    hPage.clickCronResetBtn();

    cy.get(hPage.setScheduleBtn).should('be.disabled');
  });

  it('should show cron pattern´s syntax examples when the info button in the planning page is pressed', () => {
    hPage.getCronInfo(constants.CKAN_DB_ID);

    hPage.checkCronInfos();
  });

  it('should not import if the schedule is planned but off', () => {
    hPage.setScheduleTo(constants.CKAN_DB_ID, '* * * * *');

    hPage.openScheduleDialog(constants.CKAN_DB_ID);
    hPage.deactivateScheduler();
    hPage.applyScheduleDialog();

    hPage.nextExecutionContains(constants.CKAN_DB_ID, 'deaktiviert', true);

    const importsDate = Cypress.moment().format('DD.MM.YY, HH:mm');
    const nextImport = Cypress.moment(importsDate, 'DD.MM.YY, HH:mm').add(1, 'minute').format('DD.MM.YY, HH:mm');

    // check no import is executed in a minute
    hPage.wait(60000);
    hPage.lastExecutionContains(constants.CKAN_DB_ID, nextImport, false);

    hPage.openScheduleDialog(constants.CKAN_DB_ID);
    hPage.activateScheduler();
    hPage.applyScheduleDialog();
  });

  it('should disable scheduling for a harvester', () => {
    hPage.openScheduleDialog(constants.CKAN_TEST_ID);

    hPage.deactivateScheduler(constants.CKAN_TEST_ID);
    hPage.applyScheduleDialog();

    hPage.nextExecutionContains(constants.CKAN_TEST_ID, 'deaktiviert', true);
  });
});
