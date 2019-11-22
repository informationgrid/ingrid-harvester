/**
 * go to configuration page
 */
Cypress.Commands.add("goToConfig", () => {
  cy.get('[data-test=menu-config]').click();
});

/**
 * go to harvester page
 */
Cypress.Commands.add("goToHarvester", () => {
  cy.get('[data-test=menu-harvester]').click();
});

/**
 * go to log page
 */
Cypress.Commands.add("goToLog", () => {
  cy.get('[data-test=menu-log]').click();
});

/**
 * go to indices page
 */
Cypress.Commands.add("goToIndices", () => {
  cy.get('[data-test=menu-indices]').click();
});
