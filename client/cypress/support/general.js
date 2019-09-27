/**
 * Login command
 */
Cypress.Commands.add("login", (username, password) => {
  cy.get('input[formcontrolname="username"]').type(username);
  cy.get('input[formcontrolname="password"]').type(password);

  cy.get('[data-test=login]').click();
});

Cypress.Commands.add("fastLogin", (user, psw) => {
 cy.request('POST', 'rest/passport/login', {username: user, password: psw});
});

/**
 * Logout Command
 */
Cypress.Commands.add("logout", () => {
  cy.get('[data-test=logout]').click();
});

/**
 * change to configuration page
 */
Cypress.Commands.add("goToConfig", () => {
  cy.get('[data-test=menu-config]').click();
});

/**
 * change to harvester page
 */
Cypress.Commands.add("goToHarvester", () => {
  cy.get('[data-test=menu-harvester]').click();
});

/**
 * change to log page
 */
Cypress.Commands.add("goToLog", () => {
  cy.get('[data-test=menu-log]').click();
});
