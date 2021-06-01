import ConfigurationPage from '../../support/pageObjects/configuration';
import Authentication from '../../support/pageObjects/auth';

describe('Configuration of general settings', () => {
  const configPage = new ConfigurationPage();
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
    // no value in the url field
    configPage.setElasticSearchUrl('http://localhost:92000000');
    configPage.saveButtonIsDisabled();

    configPage.resetConfig();

    // no value in the alias field
    configPage.setAlias(' ');
    configPage.saveButtonIsDisabled();
  });

  it('should check that the save button is disabled if wrong port values are inserted [INPUT CONTROL]', () => {
    // value is too big
    configPage.setElasticSearchUrl('http://localhost:92000000');
    configPage.saveButtonIsDisabled();

    // value is NaN
    configPage.setElasticSearchUrl('http://localhost:porttout');
    configPage.saveButtonIsDisabled();

    // value is negative
    configPage.setElasticSearchUrl('http://localhost:-42');
    configPage.saveButtonIsDisabled();
  });

  it('should export the harvester configuration if the right request in made', () => {
    configPage.exportAndCheckConfigDownloadApi();
  });

  it('should export the general configuration when the export configuration button is pressed', () => {
    cy.intercept('general').as('generalConfig');

    configPage.visit();
    configPage.selectTab(configPage.EXPORT);
    configPage.pressDownloadConfig();

    cy.wait('@generalConfig').its('request').then((req) => {
      cy.request(req)
        .then(({body, headers, status}) => {
          expect(headers).to.have.property('etag');
          expect(status).to.eq(304);
        });
    });
  });

  it('should export the mapping configuration when the export mapping button is pressed', () => {
    cy.intercept('filecontent').as('mappingConfig');

    configPage.visit();
    configPage.selectTab(configPage.EXPORT);
    configPage.pressDownloadMapping();

    cy.wait('@mappingConfig').its('request').then((req) => {
      cy.request(req)
        .then(({body, headers, status}) => {
          expect(headers).to.have.property('etag');
          expect(status).to.eq(304);
        });
    });
  });

  it('should export the harvester configuration when the export harvester button is pressed', () => {
    cy.intercept('harvester').as('harvesterConfig');

    configPage.visit();
    configPage.selectTab(configPage.EXPORT);
    configPage.pressDownloadHarvester();

    cy.wait('@harvesterConfig').its('request').then((req) => {
      cy.request(req)
        .then(({body, headers, status}) => {
          expect(headers).to.have.property('etag');
          expect(status).to.eq(304);
        });
    });
  });

});
