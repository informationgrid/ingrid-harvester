Cypress.Commands.add("login", (username, password) => {
  cy.get('input[formcontrolname="username"]').type(username);
  cy.get('input[formcontrolname="password"]').type(password);
  // cy.get('#btnSubmit').click();
  cy.get('[data-test=login]').click();
});

