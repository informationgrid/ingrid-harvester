
describe('configuration tab operations', () => {
  const ConfigurationPage = require("../support/pageObjects/configuration");
  const configPage = new ConfigurationPage();

  beforeEach(() => {
    cy.apiLoginUserCheck();
    configPage.visit();
  });

  /**
   * clean up after the tests'
   */
  afterEach(() => {
    configPage.resetConfigApi();
  });

  it('should update the elastic search-url, the alias and proxy values, save and check the saved data', () => {
    configPage.wait(500);

    configPage.setElasticSearchUrl('http://localhost:9209');
    configPage.setAlias('eman-saila');
    configPage.setProxy('yxorp');

    configPage.saveConfig();

    configPage.reload();

    configPage.checkElasticSearchUrl('http://localhost:9209');
    configPage.checkAlias('eman-saila');
    configPage.checkProxy('yxorp');
  });

  it('should update elastic search-url, alias and proxy, reset to default and check the reset is successful', () => {
    configPage.setElasticSearchUrl('http://localhost:92000000');
    configPage.setAlias('eman-saila');
    configPage.setProxy('yxorp');

    configPage.resetConfig();

    //values have NOT been modified
    configPage.checkElasticSearchUrl('http://localhost:9200');
    configPage.checkAlias('mcloud');
    configPage.checkProxy('');
  });

  it('should check that the save button is disabled if only spaces are inserted [INPUT CONTROL]', () => {
    configPage.wait(500);
    //no value in the url field
    configPage.setElasticSearchUrl('http://localhost:92000000');
    configPage.saveButtonIsDisabled();

    configPage.resetConfig();

    //no value in the alias field
    configPage.setAlias(' ');
    configPage.saveButtonIsDisabled();
  });

  it('should check that the save button is disabled if wrong port values are inserted [INPUT CONTROL]', () => {
    //value is too big
    configPage.setElasticSearchUrl('http://localhost:92000000');
    configPage.saveButtonIsDisabled();

    //value is NaN
    configPage.setElasticSearchUrl('http://localhost:porttout');
    configPage.saveButtonIsDisabled();

    //value is negative
    configPage.setElasticSearchUrl('http://localhost:-42');
    configPage.saveButtonIsDisabled();
  });

  it('should export the harvester configuration if the right request in made', () => {
    cy.request({
      headers: {accept: 'application/json, text/plain, */*', referer: '/config'},
      method: 'GET',
      url: '/rest/api/harvester'
      }).then((response) => {
    expect(response.headers).to.have.property('content-type', 'application/json; charset=utf-8');
    expect(response.headers).to.have.property('etag');
    });
  });

  /**
   * In Electron a save dialog is shown which prevents further test execution
   * TODO: Wait for issue: https://github.com/cypress-io/cypress/issues/949
   */
  it('should export the harvester configuration if the button is pressed', () => {
    cy.server();
    cy.route('GET', 'http://192.168.0.228/importer/rest/api/harvester').as('download');
    cy.goToConfig();

    cy.get('.mat-flat-button').contains('Export der Harvester-Konfiguration').click();

    cy.wait('@download').then((xhr) => {
      expect(xhr.responseHeaders).to.have.property('content-type', 'application/json; charset=utf-8');
      expect(xhr.responseHeaders).to.have.property('etag'); //etag value to check
    });
  });
});
