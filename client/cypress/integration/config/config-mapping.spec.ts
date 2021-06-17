import ConfigurationPage from '../../support/pageObjects/configuration';
import Authentication from '../../support/pageObjects/auth';

describe('Configuration of Mapping-Formats', () => {
  const configPage = new ConfigurationPage();
  const auth = new Authentication();

  let mapSource = 'mapping_source';
  let mapDest = 'mapping_destination';

  beforeEach(() => {
    auth.apiLogIn();
    configPage.visit();
    configPage.selectTab(configPage.MAPPING);
    // buttons need some time to be initialized, otherwise click event will not work
    cy.wait(100);
  });

  it('should show a list of mapped values', () => {
    let mapList = configPage.getAllMappings();

    mapList.should('contain', 'html')
      .and('contain', 'json')
      .and('contain', 'pdf')
      .and('contain', 'png')
      .and('contain', 'csv')
      .and('contain', 'download')
      .and('contain', 'zip');
  });

  it('should add a new mapped value', () => {
    configPage.addNewMapping();
    configPage.fillMappingValues(mapSource, mapDest);
    configPage.saveMapping();
    cy.wait(500);
    cy.reload();
    configPage.selectTab(configPage.MAPPING);

    //  check mapping has been inserted
    configPage.checkMappingExists(mapSource, true);
  });

  it('should delete a mapped value', () => {
    const toDelete = 'http://publications.europa.eu/resource/authority/file-type/pdf';

    configPage.deleteMapping(toDelete);
    configPage.checkMappingExists(toDelete, false);
  });

});
