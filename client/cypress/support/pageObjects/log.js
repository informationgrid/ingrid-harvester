class LogPage {
  info = '.info'
  warn = '.warn'


  visit() {
    cy.visit('log');
  }

  infoIsContained(info){
    cy.get(this.info).should('contain', info);
  }

  warnIsContained(warning){
    cy.get(this.warn).should('contain', warning);
  }
}

export default LogPage;
