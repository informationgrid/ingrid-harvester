describe('Configuration of general settings', () => {
  const ConfigurationPage = require("../../support/pageObjects/configuration");
  const configPage = new ConfigurationPage();

  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();

  beforeEach(() => {
    auth.apiLogIn();
    configPage.visit();
  });

  afterEach(() => {
    configPage.resetConfigApi();
  });

  it('should update the elastic search-url, the alias and proxy values, save and check the saved data', () => {
    cy.wait(500);

    configPage.setElasticSearchUrl('http://localhost:9209');
    configPage.setAlias('eman-saila');
    configPage.setProxy('yxorp');

    configPage.saveConfig();

    cy.reload();

    configPage.checkElasticSearchUrl('http://localhost:9209');
    configPage.checkAlias('eman-saila');
    configPage.checkProxy('yxorp');
  });

  it('should update elastic search-url, alias and proxy, reset to default and check the reset is successful', () => {
    configPage.setElasticSearchUrl('http://localhost:92000000');
    configPage.setAlias('eman-saila');
    configPage.setProxy('yxorp');

    configPage.resetConfig();

    configPage.checkElasticSearchUrl('http://localhost:9200');
    configPage.checkAlias('mcloud');
    configPage.checkProxy('');
  });

  it('should check that the save button is disabled if only spaces are inserted [INPUT CONTROL]', () => {
    cy.wait(500);
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
    configPage.exportAndCheckConfigDownloadApi();
  });

  /**
   * In Electron a save dialog is shown which prevents further test execution
   * TODO: Wait for issue: https://github.com/cypress-io/cypress/issues/949
   */
  it('should export the harvester configuration if the button is pressed', () => {
    cy.server();
    cy.route('GET', 'http://192.168.0.228/importer/rest/api/config/general').as('download');
    configPage.visit();
    configPage.selectTab(configPage.EXPORT);
    configPage.pressDownloadConfigButton();

    cy.wait('@download').then((xhr) => {
      expect(xhr.responseHeaders).to.have.property('content-type', 'application/json; charset=utf-8');
      expect(xhr.responseHeaders).to.have.property('etag'); //etag value to check
    });
  });
});
