describe('Import operations', () => {
  let Constants = require("../../support/constants");
  const constants = new Constants();

  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();
  const HarvesterPage = require("../../support/pageObjects/harvester/harvester");
  const hPage = new HarvesterPage();

  beforeEach(() => {
    auth.apiLoginWithUserCheck();
  });

  it('should open a harvester, start an import and check it is successful', () => {
    hPage.importHarvesterById(constants.CKAN_DB_ID);
    hPage.checkImportHasStarted();

    const importsDate = Cypress.moment().format('DD.MM.YY, HH:mm');
    hPage.checkImportDate(constants.CKAN_DB_ID, importsDate);
  });

  it('should import all harvesters at once and check a message is shown', () => {
    hPage.importAllHarvester();
    hPage.checkImportAllMsg();
  });

  it('should show last import info of an harvester after page refresh', () => {
    hPage.importHarvesterById(constants.CKAN_DB_ID);
    hPage.checkImportHasStarted();

    hPage.wait(4500); //wait for import to finish, AVG time: <3 sec
    hPage.reload();

    const importsDate = Cypress.moment().format('DD.MM.YY, HH:mm');
    hPage.checkImportDate(constants.CKAN_DB_ID, importsDate);
  });

  it('should show an icon if a harvester has an import schedule', () => {
    hPage.setSchedule(constants.CKAN_TEST_ID, '30 4 1 * 0,6');

    hPage.deactivateToggleBar(constants.CKAN_TEST_ID);
    hPage.alarmOffIconIsShown(constants.CKAN_TEST_ID);

    hPage.activateToggleBar(constants.CKAN_TEST_ID);
    hPage.alarmOnIconIsShown(constants.CKAN_TEST_ID);

    hPage.deactivateToggleBar(constants.CKAN_TEST_ID);
  });
});
