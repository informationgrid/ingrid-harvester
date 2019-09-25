/**
 * press save button
 */
function pressSaveButton() {
  cy.get('.mat-button').contains('Speichern').click();
}

/**
 * press reset button
 */
function pressResetButton() {
  cy.get('.mat-button').contains('Zurücksetzen').click();
}

describe('Configuration', () => {

  beforeEach(() => {
    cy.visit('');
    cy.login('admin', 'admin');
    cy.goToConfig();
  });

  after( () => {
    cy.get('[name="elasticsearchUrl"]').clear().type('http://localhost:9200');
    cy.get('[name="alias"]').clear().type('mcloud');
    cy.get('[name="proxy"]').clear();
    pressSaveButton();
  });

  it('should update elastic search-url, alias and proxy and reset to default', () =>{
    cy.get('[name="elasticsearchUrl"]').clear().type('http://localhost:92000000');
    cy.get('[name="alias"]').clear().type('eman-saila');
    cy.get('[name="proxy"]').clear().type('yxorp');

    pressResetButton();

    cy.get('[name="elasticsearchUrl"]').should('have.value','http://localhost:9200');
    cy.get('[name="alias"]').should('have.value','mcloud');
    cy.get('[name="proxy"]').should('have.value','');
  });

  it('should update elastic search-url, alias and proxy and save', () =>{
    cy.get('[name="elasticsearchUrl"]').clear().type('http://localhost:92000000');
    cy.get('[name="alias"]').clear().type('eman-saila');
    cy.get('[name="proxy"]').clear().type('yxorp');

    pressSaveButton();

    cy.get('[name="elasticsearchUrl"]').should('have.value','http://localhost:92000000');
    cy.get('[name="alias"]').should('have.value','eman-saila');
    cy.get('[name="proxy"]').should('have.value','yxorp');

  });

  xit('should not allow elasticsearch port higher than 65535?', () =>{});
  xit('should not allow chars als port ? ', () =>{});

});
