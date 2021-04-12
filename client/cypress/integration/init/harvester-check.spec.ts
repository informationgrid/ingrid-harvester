import Authentication from '../../support/pageObjects/auth';
import Constants from '../../support/constants';
import HarvesterPage from '../../support/pageObjects/harvester/harvester';

describe('All harvesters used in tests can import successfully', () => {
  const constants = new Constants();
  const auth = new Authentication();
  const harvester = new HarvesterPage();

  beforeEach(() => {
    auth.apiLogIn();
  });

  it('should import successfully with the ckan harvester of "Deutsche Bahn Datenportal"', () => {
  harvester.importHarvesterById(constants.CKAN_DB_ID);
  harvester.checkImportHasStarted();
  harvester.waitForImportToFinish(constants.CKAN_DB_ID);
  harvester.checkNoErrors(constants.CKAN_DB_ID);
  });

  it('should import successfully with the ckan harvester of "Open-Data-Portal des Rhein-Neckar-Verkehrs (RNV)"', () => {
  harvester.importHarvesterById(constants.CKAN_RNV_ID);
  harvester.checkImportHasStarted();

  harvester.waitForImportToFinish(constants.CKAN_RNV_ID);
  harvester.checkNoErrors(constants.CKAN_RNV_ID);
  });

  it('should import successfully with the ckan harvester of "MobiData BW"', () => {
  harvester.importHarvesterById(constants.CKAN_MOBIDATA_BW_ID);
  harvester.checkImportHasStarted();
  harvester.waitForImportToFinish(constants.CKAN_MOBIDATA_BW_ID);
  harvester.checkNoErrors(constants.CKAN_MOBIDATA_BW_ID);
  });

  it('should import successfully with the ckan harvester of "GeoNet.MRN"', () => {
  harvester.importHarvesterById(constants.CKAN_GEONET_ID);
  harvester.checkImportHasStarted();
  harvester.waitForImportToFinish(constants.CKAN_GEONET_ID);
  harvester.checkNoErrors(constants.CKAN_GEONET_ID);
  });

  it('should import successfully with the ckan harvester of "OpenData Berlin"', () => {
    harvester.importHarvesterById(constants.CKAN_BERLIN_ID);
    harvester.checkImportHasStarted();
    harvester.waitForImportToFinish(constants.CKAN_BERLIN_ID);
    harvester.checkNoErrors(constants.CKAN_BERLIN_ID);
  });

  it('should import successfully with the csw harvester of "CODEDE"', () => {
  harvester.importHarvesterById(constants.CSW_CODEDE_ID);
  harvester.checkImportHasStarted();
  harvester.waitForImportToFinish(constants.CSW_CODEDE_ID);
  harvester.checkNoErrors(constants.CSW_CODEDE_ID);
  });

  it('should import successfully with the csw harvester of "WSV: Wasserstraßen- und Schifffahrtsverwaltung des Bundes"', () => {
  harvester.importHarvesterById(constants.CSW_WSV_ID);
  harvester.checkImportHasStarted();
  harvester.waitForImportToFinish(constants.CSW_WSV_ID);
  harvester.checkNoErrors(constants.CSW_WSV_ID);
  });

});
