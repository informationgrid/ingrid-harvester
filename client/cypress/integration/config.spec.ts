/**
 * press save button
 */
function pressSaveButton() {
  cy.get('[data-test=save]').click();
}

/**
 * press reset button
 */
function pressResetButton() {
  cy.get('[data-test=reset]').contains('Zurücksetzen').click();
}

function sendConfigToApi() {
  cy.request({
    method: 'POST',
    url: 'rest/api/config/general',
    body: {"elasticSearchUrl":"http://localhost:9200",
      "alias":"mcloud",
      "proxy":"",
      "sessionSecret":"mysecretkey"}
  });
  }

describe('configuration tab operations', () => {
  beforeEach(() => {
    if (window.localStorage.getItem('currentUser') !== 'undefined') {
      cy.apiLogin('admin', 'admin');
    }
    cy.goToConfig();
  });

  /**
   * clean up after the tests'
   */
  afterEach(() => {
    sendConfigToApi();
  });

  it('should update the elastic search-url, the alias and proxy values, save and check the saved data', () => {
    cy.wait(500);
    cy.get('[formcontrolname="elasticSearchUrl"]').clear().type('http://localhost:9209');
    cy.get('[formcontrolname="alias"]').clear().type('eman-saila');
    cy.get('[formcontrolname="proxy"]').clear().type('yxorp');

    pressSaveButton();
    cy.reload();

    //check values have been modified
    cy.get('[formcontrolname="elasticSearchUrl"]').should('have.value', 'http://localhost:9209');
    cy.get('[formcontrolname="alias"]').should('have.value', 'eman-saila');
    cy.get('[formcontrolname="proxy"]').should('have.value', 'yxorp');
  });

  it('should update elastic search-url, alias and proxy, reset to default and check the reset is successful', () => {
    cy.get('[formcontrolname="elasticSearchUrl"]').clear().type('http://localhost:92000000');
    cy.get('[formcontrolname="alias"]').clear().type('eman-saila');
    cy.get('[formcontrolname="proxy"]').clear().type('yxorp');

    pressResetButton();

    //check values have NOT been modified
    cy.get('[formcontrolname="elasticSearchUrl"]').should('have.value', 'http://localhost:9200');
    cy.get('[formcontrolname="alias"]').should('have.value', 'mcloud');
    cy.get('[formcontrolname="proxy"]').should('have.value', '');
  });

  it('should check that the save button is disabled if only spaces are inserted [INPUT CONTROL]', () => {
    cy.wait(500);
    //no value in the url field
    cy.get('[formcontrolname="elasticSearchUrl"]').clear().type(' ');
    cy.get('[data-test="save"]').should('be.disabled');

    cy.get('[formcontrolname="elasticSearchUrl"]').clear().type('http://localhost:9200');

    //no value in the alias field
    cy.get('[formcontrolname="alias"]').clear().type(' ');
    cy.get('[data-test="save"]').should('be.disabled');

    cy.get('[formcontrolname="alias"]').clear().type('mcloud');
    cy.get('[data-test="save"]').should('be.enabled');
  });

  it('should check that the save button is disabled if wrong port values are inserted [INPUT CONTROL]', () => {
    //no value
    cy.get('[formcontrolname="elasticSearchUrl"]').clear();
    cy.get('[data-test="save"]').should('be.disabled');

    //value is too big
    cy.get('[formcontrolname="elasticSearchUrl"]').clear().type('http://localhost:92000000');
    cy.get('[data-test="save"]').should('be.disabled');

    //value is NaN
    cy.get('[formcontrolname="elasticSearchUrl"]').clear().type('http://localhost:porttout');
    cy.get('[data-test="save"]').should('be.disabled');

    //value is negative
    cy.get('[formcontrolname="elasticSearchUrl"]').clear().type('http://localhost:-42');
    cy.get('[data-test="save"]').should('be.disabled');
  });

  it('should export the harvester configuration if the right request in made', () => {
    cy.goToConfig();
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
