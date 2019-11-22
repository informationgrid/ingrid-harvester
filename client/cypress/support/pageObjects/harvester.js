class HarvesterPage {
  constructor() {
  }

  visit() {
    cy.visit('harvester');
  }

  wait(ms){
    cy.wait(ms);
  }



}

export default HarvesterPage;
