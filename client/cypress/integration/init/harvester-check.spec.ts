import Authentication from '../../support/pageObjects/auth';
import Constants from '../../support/constants';
import HarvesterPage from '../../support/pageObjects/harvester/harvester';
import McloudHome from '../../support/pageObjects/mcloudHome';

describe('All harvesters used in tests can import successfully', () => {
  const constants = new Constants();
  const auth = new Authentication();
  const harvester = new HarvesterPage();
  const mcloudPage = new McloudHome();

  // issue 1963

  beforeEach(() => {
    auth.apiLogIn();
  });

  it('should import and find search results of the CKAN-DB harvester', () => {
    const docToFind = '_id:\"7e526b8c-16bd-4f2c-a02b-8d4d0a29d310\"';

    harvester.activateForSearch(constants.CKAN_DB_ID);
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

  it('should import and find search results of the CKAN-RNV harvester', () => {
    const docToFind = '_id:\"5b3bb569-e812-41bf-9d53-8f4585232dbf\"';

    harvester.activateForSearch(constants.CKAN_RNV_ID);
    harvester.importHarvesterById(constants.CKAN_RNV_ID);
    harvester.checkImportHasStarted();
    harvester.waitForImportToFinish(constants.CKAN_RNV_ID);
    harvester.checkNoErrors(constants.CKAN_RNV_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchFor(docToFind);
    mcloudPage.clickOnSearchResult('Linien');
    mcloudPage.checkTitle('Linien');
  });

  it('should import and find search results of the CKAN-MOBIDATA-BW harvester', () => {
    const docToFind = '_id:\"21a85e98-3235-4dce-9670-c49e0c7e2b10\"';

    harvester.activateForSearch(constants.CKAN_MOBIDATA_BW_ID);
    harvester.importHarvesterById(constants.CKAN_MOBIDATA_BW_ID);
    harvester.checkImportHasStarted();
    harvester.waitForImportToFinish(constants.CKAN_MOBIDATA_BW_ID);
    harvester.checkNoErrors(constants.CKAN_MOBIDATA_BW_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchFor(docToFind);
    mcloudPage.clickOnSearchResult('Soll-Fahrplandaten S-Bahnen und U-Bahnen BW - mit Linienverlauf');
    mcloudPage.checkTitle('Soll-Fahrplandaten S-Bahnen und U-Bahnen BW - mit Linienverlauf');
  });

  it('should import and find search results of the CKAN-GEONET harvester', () => {
    const docToFind = '_id:\"0dce6153-550c-4d48-8175-7743db334669\"';

    harvester.activateForSearch(constants.CKAN_GEONET_ID);
    harvester.importHarvesterById(constants.CKAN_GEONET_ID);
    harvester.checkImportHasStarted();
    harvester.waitForImportToFinish(constants.CKAN_GEONET_ID);
    harvester.checkNoErrors(constants.CKAN_GEONET_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchFor(docToFind);
    mcloudPage.clickOnSearchResult('rnv-Haltestellen mit Linienreferenz');

  });
  it('should import and find search results of the CKAN-BERLIN harvester', () => {

    const docToFind = '_id:\"094a385e-50e9-471b-947e-0ab0d216d2c8\"';
    harvester.activateForSearch(constants.CKAN_BERLIN_ID);
    harvester.importHarvesterById(constants.CKAN_BERLIN_ID);
    harvester.checkImportHasStarted();
    harvester.waitForImportToFinish(constants.CKAN_BERLIN_ID);

    harvester.checkNoErrors(constants.CKAN_BERLIN_ID);
    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchFor(docToFind);
    mcloudPage.clickOnSearchResult('Strat. Lärmkarte L_N (Nacht-Index) Straßen-/U-Bahnverkehr 2017 (UA) - [Atom]');
    mcloudPage.checkTitle('Strat. Lärmkarte L_N (Nacht-Index) Straßen-/U-Bahnverkehr 2017 (UA) - [Atom]');
  });

  it('should import and find search results of the CSW Deutsche Flugsicherung harvester', () => {
    const docToFind = '_id:\"73b4aa43-6e9d-489e-bb2e-4b86cfd53617\"';

    harvester.activateForSearch(constants.CSW_DFS_ID);
    harvester.importHarvesterById(constants.CSW_DFS_ID);
    harvester.checkImportHasStarted();
    harvester.waitForImportToFinish(constants.CSW_DFS_ID);
    harvester.checkNoErrors(constants.CSW_DFS_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchFor(docToFind);
    mcloudPage.clickOnSearchResult('DFS - INSPIRE Air Transport Network');
    mcloudPage.checkTitle('DFS - INSPIRE Air Transport Network');
  });

  it('should import and find search results of the CSW-WSV harvester', () => {
    const docToFind = 'extras.metadata.source.attribution:"WSV.Geokatalog CSW"';
    const docTitle = 'WMS Wasserstraßenverkehrsnetz (INSPIRE TN-W)';

    harvester.activateForSearch(constants.CSW_WSV_ID);
    harvester.importHarvesterById(constants.CSW_WSV_ID);
    harvester.checkImportHasStarted();
    harvester.waitForImportToFinish(constants.CSW_WSV_ID);
    harvester.checkNoErrors(constants.CSW_WSV_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchFor(docToFind);
    mcloudPage.clickOnSearchResult(docTitle);
    mcloudPage.checkAuthor('Informationstechnikzentrum Bund (ITZBund)');
    mcloudPage.checkCopyrightNotice('Nutzungsbestimmungen für die Bereitstellung von Geodaten des Bundes');
    mcloudPage.checkDownloadCount(1);
  });

  it('should import and find search results of the CSW-BFG index', () => {
    const docToFind = '_id:\"cf3ad7b9-8346-4408-addd-b208282c4a1b\"';

    harvester.activateForSearch(constants.CSW_BFG_ID);
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

  it('should import and find search results of the CSW-DWD harvester', () => {
    const docToFind = 'extras.metadata.source.attribution:"DWD"';
    const docTitle = 'WMS-Dienst des Deutschen Wetterdienstes für Klimadaten';

    harvester.activateForSearch(constants.CSW_DWD_ID);
    harvester.importHarvesterById(constants.CSW_DWD_ID);
    harvester.checkImportHasStarted();
    harvester.waitForImportToFinish(constants.CSW_DWD_ID);
    harvester.checkNoErrors(constants.CSW_DWD_ID);

    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchFor(docToFind);
    mcloudPage.clickOnSearchResult(docTitle);
    mcloudPage.checkAuthor('Deutscher Wetterdienst');
    mcloudPage.checkCopyrightNotice('Unbekannt');
    mcloudPage.checkDownloadCount(1);
  });

  it('should find search results of the excel index', () => {
    const docTitle = 'Historische 10-minütige Stationsmessungen der Solarstrahlung, ' +
      'der atmosphärischen Gegenstrahlung und der Sonnenscheindauer in Deutschland';

    // harvester imported already by schedule
    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchFor(docTitle);
    mcloudPage.clickOnSearchResult(docTitle);
    mcloudPage.checkAuthor('Bundesministerium für Verkehr und digitale Infrastruktur (BMVI)');
    mcloudPage.checkCopyrightNotice('Nutzungsbestimmungen für die Bereitstellung von Geodaten des Bundes');
    mcloudPage.checkDataHasDownloadType('Dateidownload');
    mcloudPage.checkDownloadCount(1);
  });

  it('should find search results of the IGE index', () => {
    const docTitle = 'mCLOUD IGE Datensatz';

    // harvester imported already by scheduler
    mcloudPage.visitMcloudHome();
    mcloudPage.urlIsMcloudHome();
    mcloudPage.searchFor(docTitle);
    mcloudPage.clickOnSearchResult(docTitle);
    mcloudPage.checkAuthor('mCLOUD Test Institution');
    mcloudPage.checkCopyrightNotice('Creative Commons CC Zero License (cc-zero)');
    mcloudPage.checkDataHasKnownDownloadType('FTP');
    mcloudPage.checkDataHasDownloadType('Portal (CSV)');
    mcloudPage.checkDownloadCount(3);
  });
});
