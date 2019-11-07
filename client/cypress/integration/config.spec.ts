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

describe('configuration tab operations', () => {
  beforeEach(() => {
    cy.apiLogin('admin', 'admin');
    cy.goToConfig();

    //clean up state
    // TODO: use API request to set configuration in backend directly (much faster!)
    // TODO: should be executed in afterEach to make sure that state is clean after last test
    cy.get('[formcontrolname=elasticSearchUrl]').clear().type('http://localhost:9200');
    cy.get('[formcontrolname=alias]').clear().type('mcloud');
    cy.get('[formcontrolname=proxy]').clear();
    pressSaveButton();
  });

  it('should update the elastic search-url, the alias and proxy values, save and check the saved data', () => {
    cy.get('[formcontrolname=elasticSearchUrl]').clear().type('http://localhost:9209');
    cy.get('[formcontrolname=alias]').clear().type('eman-saila');
    cy.get('[formcontrolname=proxy]').clear().type('yxorp');

    pressSaveButton();
    cy.reload();

    //checks
    cy.get('[formcontrolname=elasticSearchUrl]').should('have.value', 'http://localhost:9209');
    cy.get('[formcontrolname=alias]').should('have.value', 'eman-saila');
    cy.get('[formcontrolname=proxy]').should('have.value', 'yxorp');

  });

  it('should update elastic search-url, alias and proxy, reset to default and check the reset is successful', () => {
    cy.get('[formcontrolname=elasticSearchUrl]').clear().type('http://localhost:92000000');
    cy.get('[formcontrolname=alias]').clear().type('eman-saila');
    cy.get('[formcontrolname=proxy]').clear().type('yxorp');

    pressResetButton();

    //checks
    cy.get('[formcontrolname=elasticSearchUrl]').should('have.value', 'http://localhost:9200');
    cy.get('[formcontrolname=alias]').should('have.value', 'mcloud');
    cy.get('[formcontrolname=proxy]').should('have.value', '');
  });

  it('should check that the save button is disabled if only spaces are inserted [INPUT CONTROL]', () => {
    //no value
    cy.get('[formcontrolname=elasticSearchUrl]').clear().type(' ');
    cy.get('[data-test=save]').should('be.disabled');

    cy.get('[formcontrolname=elasticSearchUrl]').clear().type('http://localhost:9200');
    cy.get('[formcontrolname=alias]').clear().type(' ');
    cy.get('[data-test=save]').should('be.disabled');

    cy.get('[formcontrolname=alias]').clear().type('mcloud');
    cy.get('[data-test=save]').should('be.enabled');
  });

  it('should check that the save button is disabled if wrong port values are inserted [INPUT CONTROL]', () => {
    //no value
    cy.get('[formcontrolname=elasticSearchUrl]').clear();
    cy.get('[data-test=save]').should('be.disabled');

    //value is too big
    cy.get('[formcontrolname=elasticSearchUrl]').clear().type('http://localhost:92000000');
    cy.get('[data-test=save]').should('be.disabled');

    //value is NaN
    cy.get('[formcontrolname=elasticSearchUrl]').clear().type('http://localhost:porttout');
    cy.get('[data-test=save]').should('be.disabled');

    //value is negative
    cy.get('[formcontrolname=elasticSearchUrl]').clear().type('http://localhost:-42');
    cy.get('[data-test=save]').should('be.disabled');
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

  xit('should export the harvester configuration if the button is pressed', () => {
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
