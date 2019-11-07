/**
 * press import all button
 */
Cypress.Commands.add('importAll', () => {
  cy.get('[data-test="import-all"]').click();
});
