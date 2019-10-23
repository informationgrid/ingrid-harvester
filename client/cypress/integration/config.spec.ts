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
    cy.get('[name=elasticsearchUrl]').clear().type('http://localhost:9200');
    cy.get('[name=alias]').clear().type('mcloud');
    cy.get('[name=proxy]').clear();
    pressSaveButton();
  });

  it('should update the elastic search-url, the alias and proxy values, save and check the saved data', () => {
    cy.get('[name=elasticsearchUrl]').clear().type('http://localhost:92000000');
    cy.get('[name=alias]').clear().type('eman-saila');
    cy.get('[name=proxy]').clear().type('yxorp');

    pressSaveButton();
    cy.reload();

    //checks
    cy.get('[name=elasticsearchUrl]').should('have.value', 'http://localhost:92000000');
    cy.get('[name=alias]').should('have.value', 'eman-saila');
    cy.get('[name=proxy]').should('have.value', 'yxorp');

  });

  it('should update elastic search-url, alias and proxy, reset to default and check the reset is successful', () => {
    cy.get('[name=elasticsearchUrl]').clear().type('http://localhost:92000000');
    cy.get('[name=alias]').clear().type('eman-saila');
    cy.get('[name=proxy]').clear().type('yxorp');

    pressResetButton();

    //checks
    cy.get('[name=elasticsearchUrl]').should('have.value', 'http://localhost:9200');
    cy.get('[name=alias]').should('have.value', 'mcloud');
    cy.get('[name=proxy]').should('have.value', '');
  });

  it('should check that the save button is disabled if only spaces or special characters are inserted', () => {
    //no value
    cy.get('[name=elasticsearchUrl]').clear().type(' _');
    cy.get('[name=alias]').clear().type(' ');
    cy.get('[data-test=save]').should('be.disabled');

    cy.get('[name=alias]').clear().type('!');
    cy.get('[name=elasticsearchUrl]').clear().type('!');
    cy.get('[data-test=save]').should('be.disabled');
  });

  it('should check that the save button is disabled if wrong port values are inserted', () => {
    //no value
    cy.get('[name=elasticsearchUrl]').clear();
    cy.get('[data-test=save]').should('be.disabled');

    //value is too big
    cy.get('[name=elasticsearchUrl]').clear().type('http://localhost:92000000');
    cy.get('[data-test=save]').should('be.disabled');

    //value is NaN
    cy.get('[name=elasticsearchUrl]').clear().type('http://localhost:porttout');
    cy.get('[data-test=save]').should('be.disabled');

    //value is negative
    cy.get('[name=elasticsearchUrl]').clear().type('http://localhost:-42');
    cy.get('[data-test=save]').should('be.disabled');
  });
});
