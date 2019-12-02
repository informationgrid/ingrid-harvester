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
    hPage.setSchedule(constants.CKAN_DB_ID, '* * * * *');

    hPage.reload();

    hPage.nextExecutionContains(constants.CKAN_DB_ID, 'wurde geändert', false);
    hPage.nextExecutionContains(constants.CKAN_DB_ID, '', false);

    hPage.openSchedule(constants.CKAN_DB_ID);
    hPage.turnOffSchedule();
  });

  it('should reset cron expression if the right cancel button is pressed', () => {
    hPage.setSchedule(constants.CKAN_TEST_ID, '* * * * *');

    hPage.openSchedule(constants.CKAN_TEST_ID);
    hPage.turnOffSchedule();

    hPage.reload();
    hPage.nextExecutionContains(constants.CKAN_TEST_ID, 'deaktiviert', true);
  });

  it('should show cron pattern´s syntax examples when the info button in the planning page is pressed', () => {
    hPage.getCronInfo(constants.CKAN_DB_ID);

    hPage.checkCronInfos();
  });

  it('should not import if the schedule is planned but off [BUG]', () => {
    hPage.setSchedule(constants.CKAN_DB_ID, '* * * * *');

    hPage.wait(500);
    hPage.deactivateToggleBar(constants.CKAN_DB_ID);
    hPage.nextExecutionContains(constants.CKAN_DB_ID, 'deaktiviert', true);

    const importsDate = Cypress.moment().format('DD.MM.YY, HH:mm');
    const nextImport = Cypress.moment(importsDate, 'DD.MM.YY, HH:mm').add(1, 'minute').format('DD.MM.YY, HH:mm');
    //check no import is executed during a minute
    hPage.wait(60000);
    hPage.lastExecutionContains(constants.CKAN_DB_ID, nextImport, false);

    hPage.openSchedule(constants.CKAN_DB_ID);
    hPage.turnOffSchedule();
  });

  it('should disable scheduling for a harvester', () => {
    hPage.openSchedule(constants.CKAN_DB_ID);

    hPage.clearCronInput(constants.CKAN_DB_ID);
    hPage.nextExecutionContains(constants.CKAN_DB_ID, 'deaktiviert', true);

    hPage.setSchedule(constants.CKAN_DB_ID, '* * * * *');

    hPage.openSchedule(constants.CKAN_DB_ID);
    hPage.turnOffSchedule();
  });

  xit('should have a valid scheduling value if scheduling is active', () => {
    //scheduling button is also used for search >> wait
  });

  xit('should not be able to activate a scheduled import without an active auto-scheduling', () => {
    //scheduling button is also used for search >> wait
  });
});
