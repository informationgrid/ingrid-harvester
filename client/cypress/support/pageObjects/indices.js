class IndicesPage {
  constructor() {
    this.line = ''
  }

  visit() {
    cy.visit('indices');
  }

  wait(ms){
    cy.wait(ms);
  }

  reload(){
    cy.reload();
  }
}

export default IndicesPage;
