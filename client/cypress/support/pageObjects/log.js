class LogPage {
  constructor() {
    this.info = '.info'
  }

  visit() {
    cy.visit('log');
  }

  infoIsContained(info){
    cy.get(this.info).should('contain', info);
  }
}

export default LogPage;
