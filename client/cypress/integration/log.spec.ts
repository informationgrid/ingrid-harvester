import {throwError} from "rxjs";

describe('Log', () => {

  beforeEach(() => {
    cy.visit('');
    cy.login('admin', 'admin');
    cy.goToLog();
  });

  xit('should do something with the log', () => {

  });
});
