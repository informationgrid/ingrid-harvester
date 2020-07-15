import Authentication from "../../support/pageObjects/auth";
import Constants from "../../support/constants";
import HarvesterPage from "../../support/pageObjects/harvester/harvester";

describe('Import operations', () => {
  const constants = new Constants();
  const auth = new Authentication();
  const harvester = new HarvesterPage();

  beforeEach(() => {
    auth.apiLogIn();
  });

  it('should open a harvester, start an import and check it is successful', () => {
    harvester.importHarvesterById(constants.CKAN_DBD_ID);
    harvester.checkImportHasStarted();

    harvester.waitForImportToFinish(constants.CKAN_DBD_ID);
  });

  it('should import all harvesters at once and check a message is shown', () => {
    harvester.importAllHarvesters();
    harvester.checkImportAllMsg();
  });

  it('should show last import info of an harvester after page refresh', () => {
    harvester.importHarvesterById(constants.CKAN_DBD_ID);
    harvester.checkImportHasStarted();

    harvester.waitForImportToFinish(constants.CKAN_DBD_ID);
    cy.reload();

    harvester.checkFieldValueIs(constants.CKAN_DBD_ID, harvester.lastExecution, Cypress.moment().format('DD.MM.YY, HH:mm'));
  });

  it('should show an icon if a harvester has an import schedule', () => {
    harvester.toggleHarvesterById(constants.CKAN_GEONET_ID);
    harvester.openScheduleDialog(constants.CKAN_GEONET_ID);
    harvester.setCronPatternTo('30 4 1 * 0,6');
    harvester.activateScheduler();
    harvester.applyScheduleDialog();

    harvester.activateForSearch(constants.CKAN_GEONET_ID);
    harvester.alarmOnIconIsShown(constants.CKAN_GEONET_ID);

    harvester.deactivateForSearch(constants.CKAN_GEONET_ID);
    harvester.alarmOffIconIsShown(constants.CKAN_GEONET_ID);
  });
});
