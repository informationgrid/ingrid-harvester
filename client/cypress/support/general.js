/**
 * Login command
 */
Cypress.Commands.add("guiLogin", (username, password) => {
  //visit must be done before the log in
  cy.visit('');
  cy.get('input[formcontrolname="username"]').type(username);
  cy.get('input[formcontrolname="password"]').type(password);

  cy.get('[data-test=login]').click();
});

Cypress.Commands.add("apiLogin", (user, psw) => {
  cy.request({
    method: 'POST',
    url: 'rest/passport/login',
    body: {username: user, password: psw},
    failOnStatusCode: false
  }).then((response) => {
    if (response.body !== 'User not found') {
      window.localStorage.setItem('currentUser', JSON.stringify(response.body))
    }
  });
  cy.visit('');
});

/**
 * handle local storage (workaround) - https://github.com/cypress-io/cypress/issues/461
 */
let LOCAL_STORAGE_MEMORY = {};

Cypress.Commands.add("saveLocalStorage", () => {
  Object.keys(localStorage).forEach(key => {
    LOCAL_STORAGE_MEMORY[key] = localStorage[key];
  });
});

Cypress.Commands.add("restoreLocalStorage", () => {
  Object.keys(LOCAL_STORAGE_MEMORY).forEach(key => {
    localStorage.setItem(key, LOCAL_STORAGE_MEMORY[key]);
  });
});

/**
 * Logout Command
 */
Cypress.Commands.add("guiLogout", () => {
  cy.get('[data-test=logout]').click();
});

Cypress.Commands.add("apiLogout", () => {
  cy.request({
    method: 'GET',
    url: 'rest/passport/logout'
  });
  cy.reload();
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
