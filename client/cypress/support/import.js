/**
 * press import all button
 */
Cypress.Commands.add('importAll', () => {
  cy.get('.mat-flat-button').contains('Alle importieren').click();
});
