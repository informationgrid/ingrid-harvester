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

/**
 * Login Command
 */
Cypress.Commands.add("apiLogin", (user, psw) => {
  user = user ? user : 'admin';
  psw = psw ? psw : 'admin';
  cy.request({
    method: 'POST',
    url: 'rest/passport/login',
    body: {username: user, password: psw}
    // failOnStatusCode: false
  }).then((response) => {
    if (response.body !== 'User not found') {
      window.localStorage.setItem('currentUser', JSON.stringify(response.body))
    }
  });
  cy.visit('');
});

/**
 * Logout Command
 */
Cypress.Commands.add("guiLogout", () => {
  cy.get('[data-test=logout]').click();
});

/**
 * Logout Command
 */
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

Cypress.Commands.add("goToIndices", () => {
  cy.get('[data-test=menu-indices]').click();
});
