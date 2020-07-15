import Authentication from "../../support/pageObjects/auth";
import Constants from "../../support/constants";
import HarvesterPage from "../../support/pageObjects/harvester/harvester";
import HarvesterForm from "../../support/pageObjects/harvester/harvesterForm";

describe('Import log operations', () => {
  const constants = new Constants();
  const auth = new Authentication();
  const harvester = new HarvesterPage();
  const form = new HarvesterForm();

  beforeEach(() => {
    auth.apiLogIn();
  });

  it('should show errors in the error-log if error/warning occurred during an import', () => {
    harvester.openFormById(constants.EXCEL_TEST_ID);
    form.setFields({excelFilePath: '-./data.xlsx'});
    form.saveHarvesterConfig();
    harvester.importHarvesterById(constants.EXCEL_TEST_ID);
    harvester.openHarvesterLog(constants.EXCEL_TEST_ID);

    harvester.errorLogHasMsg('Error reading excel workbook: ');
    harvester.closeErrorLog();

    harvester.openFormById(constants.EXCEL_TEST_ID);
    form.setFields({excelFilePath: './data.xlsx'});
    form.saveHarvesterConfig();
    harvester.importHarvesterById(constants.EXCEL_TEST_ID);
  });

  it('should show no error in the logs after a successful import', () => {
    harvester.importHarvesterById(constants.CKAN_DBD_ID);
    harvester.waitForImportToFinish(constants.CKAN_DBD_ID);
    harvester.checkNoErrors(constants.CKAN_DBD_ID);
  });

  it('should show an error in the harvester logs if the CKAN index name is invalid', () => {
    harvester.openFormById(constants.CKAN_GEONET_ID);
    form.setFields({indexName: '-ckan_geonet_mrn'});
    form.saveHarvesterConfig();
    harvester.importHarvesterById(constants.CKAN_GEONET_ID);

    harvester.openHarvesterLog(constants.CKAN_GEONET_ID);
    harvester.openElasticSearchLog();
    harvester.errorLogHasMsg('[invalid_index_name_exception]');
    harvester.closeErrorLog();

    harvester.openFormById(constants.CKAN_GEONET_ID);
    form.setFields({indexName: 'ckan_geonet_mrn'});
    form.saveHarvesterConfig();
    harvester.importHarvesterById(constants.CKAN_GEONET_ID);
  });

  it('should show an error in the harvester logs if the CKAN url is invalid', () => {
    harvester.openFormById(constants.CKAN_GEONET_ID);
    form.setFields({ckanBasisUrl: '-http://ckan.geonet-mrn.de'});
    form.saveHarvesterConfig();
    harvester.importHarvesterById(constants.CKAN_GEONET_ID);

    harvester.openHarvesterLog(constants.CKAN_GEONET_ID);
    harvester.errorLogHasMsg('Error: Invalid');
    harvester.closeErrorLog();

    harvester.openFormById(constants.CKAN_GEONET_ID);
    form.setFields({ckanBasisUrl: 'http://ckan.geonet-mrn.de'});
    form.saveHarvesterConfig();
    harvester.importHarvesterById(constants.CKAN_GEONET_ID);
  });

  it('should show an error in the harvester logs if the CSW URL is not valid ', () => {
    harvester.seedCswHarvester(constants.SEED_CSW_ID);
    harvester.importHarvesterById(constants.SEED_CSW_ID);
    harvester.openHarvesterLog(constants.SEED_CSW_ID);
    harvester.errorLogHasMsg('Error: Invalid URI');
    harvester.closeErrorLog();
    harvester.deleteHarvesterById(constants.SEED_CSW_ID);
  });

  it('should show an error in the harvester logs if the Excel path is not valid', () => {
    harvester.openFormById(constants.EXCEL_TEST_ID);
    form.setFields({excelFilePath: './da-ta.xlsx'});
    form.saveHarvesterConfig();
    harvester.importHarvesterById(constants.EXCEL_TEST_ID);
    harvester.openHarvesterLog(constants.EXCEL_TEST_ID);

    harvester.errorLogHasMsg('Error reading excel workbook: Error: File not found:');
    harvester.closeErrorLog();

    harvester.openFormById(constants.EXCEL_TEST_ID);
    form.setFields({excelFilePath: './data.xlsx'});
    form.saveHarvesterConfig();
    harvester.importHarvesterById(constants.EXCEL_TEST_ID);
  });
});
