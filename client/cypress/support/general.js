/**
 * Login command
 */
Cypress.Commands.add("login", (username, password) =>  {
  cy.get('input[formcontrolname="username"]').type(username);
  cy.get('input[formcontrolname="password"]').type(password);

  cy.get('[data-test=login]').click();
});

/*Cypress.Commands.add("fastLogin", (username, password) =>  {
  const options = {
    method: 'POST',
    url: 'http://mcloud-qs.wemove.com/importer/login',
    qs: {
      //sets  query string to the url that creates
    },

    form: true, // submitting a regular form body
    body: {
      username: username,
      password: password,
    }
  };

  //       _.extend(options, overrides);

  cy.request(options);


});*/

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
