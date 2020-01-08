describe('Configuration of Mapping-Formats', () => {
  const ConfigurationPage = require("../../support/pageObjects/configuration");
  const configPage = new ConfigurationPage();

  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();

  beforeEach(() => {
    auth.apiLoginWithUserCheck();
    configPage.visit();
    // configPage.selectTab(MAPPING);
  });

  /**
   * clean up after the tests'
   */
  afterEach(() => {
  });

  xit('should show a list of mapped values', () => {

  });

  xit('should add a new mapped value', () => {

  });

  xit('should delete a new mapped value', () => {

  });

});
