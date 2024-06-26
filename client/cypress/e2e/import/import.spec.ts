import Authentication from '../../support/pageObjects/auth';
import Constants from '../../support/constants';
import HarvesterPage from '../../support/pageObjects/harvester/harvester';

describe('Import operations', () => {
  const constants = new Constants();
  const auth = new Authentication();
  const harvester = new HarvesterPage();
  const dayjs = require('dayjs');
  const customParseFormat = require('dayjs/plugin/customParseFormat');
  dayjs.extend(customParseFormat);

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
    // get last duration
    // duration =  harvester.getFieldValue(constants.CKAN_DB_ID, harvester.duration);

    harvester.importHarvesterById(constants.CKAN_RNV_ID);
    harvester.checkImportHasStarted();

    harvester.waitForImportToFinish(constants.CKAN_RNV_ID);
    cy.reload();

    // check different than last duration
    // harvester.checkFieldValueIsNot(constants.CKAN_DB_ID, harvester.duration, duration);

    let timeString = dayjs().format('DD.MM.YY, HH:mm');
    timeString = timeString.slice(0, timeString.length - 1);
    harvester.checkFieldValueIs(constants.CKAN_RNV_ID, harvester.lastExecution, timeString);
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
