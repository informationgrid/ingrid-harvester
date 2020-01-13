describe('Import operations', () => {
  let Constants = require("../../support/constants");
  const constants = new Constants();

  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../../support/pageObjects/harvester/harvester");
  const harvester = new HarvesterPage();

  beforeEach(() => {
    auth.apiLogIn();
  });

  it('should open a harvester, start an import and check it is successful', () => {
    harvester.importHarvesterById(constants.CKAN_DB_ID);
    harvester.checkImportHasStarted();

    harvester.waitForImportToFinish(constants.CKAN_DB_ID);
  });

  it('should import all harvesters at once and check a message is shown', () => {
    harvester.importAllHarvesters();
    harvester.checkImportAllMsg();
  });

  it('should show last import info of an harvester after page refresh', () => {
    harvester.importHarvesterById(constants.CKAN_DB_ID);
    harvester.checkImportHasStarted();

    harvester.waitForImportToFinish(constants.CKAN_DB_ID);
    cy.reload();

    const importsDate = Cypress.moment().format('DD.MM.YY, HH:mm');
    harvester.checkFieldValueIs(constants.CKAN_DB_ID, harvester.lastExecution, importsDate);
  });

  it('should show an icon if a harvester has an import schedule', () => {
    harvester.toggleHarvesterById(constants.CKAN_TEST_ID);
    harvester.openScheduleDialog(constants.CKAN_TEST_ID);
    harvester.setCronPatternTo('30 4 1 * 0,6');
    harvester.activateScheduler();
    harvester.applyScheduleDialog();

    harvester.activateForSearch(constants.CKAN_TEST_ID);
    harvester.alarmOnIconIsShown(constants.CKAN_TEST_ID);

    harvester.deactivateForSearch(constants.CKAN_TEST_ID);
    harvester.alarmOffIconIsShown(constants.CKAN_TEST_ID);
  });
});
