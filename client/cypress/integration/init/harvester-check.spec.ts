import Authentication from '../../support/pageObjects/auth';
import Constants from '../../support/constants';
import HarvesterPage from '../../support/pageObjects/harvester/harvester';
import McloudHome from '../../support/pageObjects/mcloudHome';

describe('All harvesters used in tests can import successfully', () => {
  const constants = new Constants();
  const auth = new Authentication();
  const harvester = new HarvesterPage();
  const mcloudPage = new McloudHome();

  beforeEach(() => {
    auth.apiLogIn();
  });

  it('should import successfully with the ckan harvester of "Deutsche Bahn Datenportal"', () => {
    const docToFind = '_id:\"7e526b8c-16bd-4f2c-a02b-8d4d0a29d310\"';

    harvester.importHarvesterById(constants.CKAN_DB_ID);
    harvester.checkImportHasStarted();
    harvester.waitForImportToFinish(constants.CKAN_DB_ID);
    harvester.checkNoErrors(constants.CKAN_DB_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchFor(docToFind);
    mcloudPage.clickOnSearchResult('Ist-Verkehrsdaten der DB Cargo auf Bst8-Ebene');
    mcloudPage.checkTitle('Ist-Verkehrsdaten der DB Cargo auf Bst8-Ebene');
    mcloudPage.checkAuthor('DB Cargo AG');
    mcloudPage.checkCopyrightNotice('Creative Commons Namensnennung (CC-BY)');
    mcloudPage.checkDataHasDownloadType('REST');
    mcloudPage.checkDownloadCount(1);

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

  it('should import successfully with the csw harvester of "Deutsche Flugsicherung"', () => {
    harvester.importHarvesterById(constants.CSW_DFS_ID);
    harvester.checkImportHasStarted();
    harvester.waitForImportToFinish(constants.CSW_DFS_ID);
    harvester.checkNoErrors(constants.CSW_DFS_ID);
  });

  it('should import successfully with the csw harvester of "WSV: Wasserstraßen- und Schifffahrtsverwaltung des Bundes"', () => {
    harvester.importHarvesterById(constants.CSW_WSV_ID);
    harvester.checkImportHasStarted();
    harvester.waitForImportToFinish(constants.CSW_WSV_ID);
    harvester.checkNoErrors(constants.CSW_WSV_ID);
  });

  it('Search results should contain data from the "CSW-BFG" index.', () => {
    const docToFind = '_id:\"cf3ad7b9-8346-4408-addd-b208282c4a1b\"';

    harvester.importHarvesterById(constants.CSW_BFG_ID);
    harvester.checkImportHasStarted();
    harvester.waitForImportToFinish(constants.CSW_BFG_ID);
    harvester.checkNoErrors(constants.CSW_BFG_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchFor(docToFind);
    mcloudPage.clickOnSearchResult('Daten von Pegeln an oberirdischen Gewässern');
    mcloudPage.checkTitle('Daten von Pegeln an oberirdischen Gewässern');
    mcloudPage.checkAuthor('Bundesanstalt für Gewässerkunde');
    mcloudPage.checkCopyrightNotice('Nutzungsbestimmungen für die Bereitstellung von Geodaten des Bundes');
    mcloudPage.checkDataHasDownloadType('GML');
    mcloudPage.checkDownloadCount(7);
  });

});
