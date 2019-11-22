class LogPage {
  constructor() {
    this.info = '.info'
  }

  visit() {
    cy.visit('log');
  }

  wait(ms){
    cy.wait(ms);
  }

  reload(){
    cy.reload();
  }

  infoIsContained(info){
    cy.get(this.info).should('contain', info);
  }
}

export default LogPage;
