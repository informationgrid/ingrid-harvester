class HarvesterPage {
  constructor() {
    this.addHarvesterBtn = '#btnAddHarvester';
    this.editHarvesterBtn = '[data-test="edit"]';
    this.deleteHarvesterBtn = '[data-test="delete"]';
    this.importAllBtn = '[data-test="import-all"]';
    this.logTab = '[data-test="log"]';

  }

  visit() {
    cy.visit('harvester');
  }

  wait(ms) {
    cy.wait(ms);
  }

  reload() {
    cy.reload();
  }

  addNewHarvester() {
    cy.get(this.addHarvesterBtn).click();
  }

  openFormById(id) {
    cy.get('#harvester-' + id).click();
    cy.get('#harvester-' + id + ' ' + this.editHarvesterBtn).click();
  }

  openHarvesterByName(name) {
    this.clickHarvesterByName(name);
    cy.get(this.editHarvesterBtn + ':visible', {timeout: 1000}).click();
  }

  clickHarvesterByName(name) {
    cy.get('.no-wrap', {timeout: 3000}).contains(name).click();
  }

  deleteHarvesterByName(name) {
    this.clickHarvesterByName(name);
    cy.get(this.deleteHarvesterBtn + ':visible').click();
    cy.get('.mat-button-wrapper').contains('Löschen').click();
  }

  importAllHarvester() {
    cy.get(this.importAllBtn).click();
  }

  openHarvesterLog(id) {
    cy.get('#harvester-' + id + ' ' + this.logTab, {timeout: 6000}).click();
  }

  activateToggleBar(id) {
    cy.get('#harvester-' + id + ' .mat-icon').then((value) => {
      if (value.text().includes('alarm_off')) {
        cy.get('#harvester-' + id + ' .mat-slide-toggle-bar').click({force: true});
      }
    });
  }

  deactivateToggleBar(id) {
    cy.get('#harvester-' + id + ' .mat-icon').then((value) => {
      if (value.text().includes('alarm_on')) {
        cy.get('#harvester-' + id + ' .mat-slide-toggle-bar').click({force: true});
      }
    });
  }

  importHarvesterById(id) {
    cy.get('#harvester-' + id).click();
    cy.get('#harvester-' + id + ' [data-test="import"]').click();
  }

  checkImportHasStarted() {
    cy.get('.mat-simple-snackbar').should('contain', 'Import gestartet');
    cy.get('app-importer-detail').should('contain', ' Import läuft ');
  }

  checkImportDate(id, importsDate) {
    cy.get('#harvester-' + id + ' [data-test=last-execution]', {timeout: 15000}).should('contain', importsDate)
  }

}

export default HarvesterPage;
