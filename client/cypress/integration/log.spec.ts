import Authentication from "../support/pageObjects/auth";
import Constants from "../support/constants";
import HarvesterPage from "../support/pageObjects/harvester/harvester";
import LogPage from "../support/pageObjects/log";

describe('Log tab operations', () => {
  const constants = new Constants();
  const auth = new Authentication();
  const harvester = new HarvesterPage();
  const logPage = new LogPage();

  beforeEach(() => {
    auth.apiLogIn();
  });

  it('should show the right information in the logs after a single harvester is imported', () => {
    harvester.importHarvesterById(constants.CKAN_DBD_ID);
    harvester.waitForImportToFinish(constants.CKAN_DBD_ID);

    logPage.visit();
    logPage.infoIsContained('[INFO] default - Deutsche Bahn Datenportal (CKAN)');
    logPage.infoIsContained('[INFO] default - Number of records:');
  });

  xit('should show information in the logs when all the harvester are imported', () => {
    harvester.importAllHarvesters();

    logPage.visit();
    logPage.infoIsContained('[INFO] default - >> Running importer:');
  });

});
