class HarvesterPage {
  addHarvesterBtn = '#btnAddHarvester';
  editHarvesterBtn = '[data-test="edit"]';
  deleteHarvesterBtn = '[data-test="delete"]';
  importAllBtn = '[data-test="import-all"]';
  logTab = '[data-test="log"]';
  importBtn = ' [data-test="import"]';
  scheduleBtn = '[data-test="schedule"]';
  cronInputField = '[data-test="cron-input"]';
  cronReset = '[data-test="cron-reset"]';
  setScheduleBtn = '[data-test="dlg-schedule"]';
  icon = ' .mat-icon';
  logContainer = ' .logContainer';
  labelContent = ' .mat-tab-label-content';
  docsNumber = '[data-test="num-docs"]';
  numErrors = '[data-test="num-errors"]';
  nextExecution = '[data-test="next-execution"]';
  lastExecution = '[data-test="last-execution"]';
  duration = '[data-test="duration"]';
  cronInfo = '[data-test="cron-info"]';
  cronToggleBar = '[title="Planung an- / ausschalten"]';

  visit() {
    cy.visit('harvester');
  }

  addNewHarvester() {
    cy.get(this.addHarvesterBtn).click();
  }

  openFormById(id) {
    cy.get('#harvester-' + id).click();
    cy.get('#harvester-' + id + ' ' + this.editHarvesterBtn).click();
    cy.wait(500);
  }

  openFormByName(name) {
    this.toggleHarvesterByName(name);
    cy.get(this.editHarvesterBtn + ':visible', {timeout: 1000}).click();
  }

  toggleHarvesterByName(name) {
    cy.get('.no-wrap', {timeout: 1500}).contains(name).click();
  }

  toggleHarvesterById(id) {
    cy.get('#harvester-' + id).click();
  }

  importAllHarvesters() {
    cy.get(this.importAllBtn).click();
  }

  openHarvesterLog(id) {
    cy.get('#harvester-' + id + ' ' + this.logTab, {timeout: 6000}).click();
  }

  activateForSearch(id) {
    cy.get('#harvester-' + id + ' .mat-slide-toggle').then((toggle) => {
      if (!toggle.hasClass('mat-checked')) {
        cy.get('#harvester-' + id + ' .mat-slide-toggle-bar').click({force: true});
      }
    });
  }

  deactivateForSearch(id) {
    cy.get('#harvester-' + id + ' .mat-slide-toggle').then((toggle) => {
      if (toggle.hasClass('mat-checked')) {
        cy.get('#harvester-' + id + ' .mat-slide-toggle-bar').click({force: true});
      }
    });
  }

  deleteHarvesterById(id) {
    cy.intercept({
      url: 'http://192.168.0.228/importer/rest/api/harvester/*',
      method: 'DELETE'
    }).as('deleteHarvester');

    cy.get('#harvester-' + id).click();
    cy.get('#harvester-' + id + ' ' + this.deleteHarvesterBtn).click();
    cy.get('.mat-button-wrapper').contains('Löschen').click();

    cy.wait('@deleteHarvester');
  }

  deleteHarvesterByName(name) {
    cy.intercept({
      url: 'http://192.168.0.228/importer/rest/api/harvester/*',
      method: 'DELETE'
    }).as('deleteHarvester');

    this.toggleHarvesterByName(name);
    cy.get(this.deleteHarvesterBtn + ':visible').click();
    cy.get('.mat-button-wrapper').contains('Löschen').click();
    cy.wait('@deleteHarvester');
  }

  openScheduleDialog(id) {
    cy.get('#harvester-' + id + ' ' + this.scheduleBtn).click();
  }

  applyScheduleDialog() {
    cy.get(this.setScheduleBtn).click();
    cy.wait(500); // give time to save settings
  }

  getHarvesterElement(id, field, options) {
    return cy.get('#harvester-' + id + ' ' + field, options);
  }

  //IMPORT OPS
  importHarvesterById(id) {
    cy.get('#harvester-' + id).click();
    return cy.get('#harvester-' + id + ' ' + this.importBtn).click();
  }
  importHarvesterByIdAndWait(id) {
    this.importHarvesterById(id).then(() => this.waitForImportToFinish(id));
  }

  importHarvesterByName(name) {
    this.toggleHarvesterByName(name);
    cy.get(this.importBtn + ':visible').click();
  }

  checkImportHasStarted() {
    cy.get('.mat-simple-snackbar', {timeout: 60000}).should('contain', 'Import gestartet');
    cy.get('app-importer-detail').should('contain', ' Import läuft ');
  }

  checkVisibleFieldValue(field, value) {
    cy.get(field + ':visible', {timeout: 45000}).should('contain', value);
  }

  checkFieldValueIs(id, field, value) {
    cy.get('#harvester-' + id + ' ' + field, {timeout: 45000}).should('contain', value);
  }

  checkFieldValueIsNot(id, field, value) {
    cy.get('#harvester-' + id + ' ' + field, {timeout: 45000}).should('not.contain', value);
  }

  checkImportAllMsg() {
    cy.get('.mat-simple-snackbar').should('contain', 'Import von allen Harvestern gestartet');
  }

  setCronPatternTo(pattern) {
    cy.get(this.cronInputField).click().clear().type(pattern);
  }

  activateScheduler() {
    cy.get(this.cronToggleBar).then((bar) => {
      if (!bar.hasClass('mat-checked')) {
        cy.get(this.cronToggleBar).click();
      }
    });
    cy.wait(500);
  }

  deactivateScheduler() {
    cy.get(this.cronToggleBar).then((bar) => {
      if (bar.hasClass('mat-checked')) {
        cy.get(this.cronToggleBar).click();
      }
    });
    cy.wait(500);
  }

  clickCronResetBtn() {
    cy.get(this.cronReset).click();
  }

  scheduleIsDeactivated() {
    cy.get(' .ng-star-inserted').should('contain', 'Planung ausschalten');
  }

  alarmOffIconIsShown(id) {
    cy.get('#harvester-' + id + this.icon).should('contain', 'alarm_off');
  }

  alarmOnIconIsShown(id) {
    cy.get('#harvester-' + id + this.icon).should('contain', 'alarm_on');
  }

  clearCronInput(id) {
    cy.get(this.cronInputField).clear();
  }

  // LOGS
  checkNoErrors(id) {
    cy.get('#harvester-' + id + ' ' + this.numErrors, {timeout: 10000})
      .invoke('text')
      .then((numErr) => {
          expect(numErr).to.equal(' 0 ');
        }
      )
  }

  errorLogHasMsg(msg) {
    cy.get(this.logContainer).should('contain', msg);
  }

  closeErrorLog() {
    cy.get(this.logContainer).type('{esc}');
  }

  openElasticSearchLog() {
    cy.get(this.labelContent).contains('Elasticsearch-Fehler').click();
  }

  waitForImportToFinish(id) {
    cy.get('#harvester-' + id + ' ' + this.lastExecution, {timeout: 45000})
      // .scrollIntoView()
      .should('contain', Cypress.moment().format('DD.MM.YY, HH:mm'));
  }

  getDocNumber(id) {
    return cy.get('#harvester-' + id + ' ' + this.docsNumber).invoke('text');
  }

  // SEEDS
  seedCkanHarvester(id) {
    cy.request({
      method: 'POST',
      url: 'rest/api/harvester/' + id,
      body: {
        "id": parseInt(id),
        "disable": true,
        "type": "CKAN",
        "description": "ckan_test_api",
        "ckanBaseUrl": "https://data.deutschebahn.com",
        "index": "ckan_api_index",
        "defaultDCATCategory": ["SOCI"],
        "defaultMcloudSubgroup": ["railway"],
        "defaultAttribution": "attr_name",
        "defaultAttributionLink": "attr_link",
        "maxRecords": 100,
        "startPosition": 0,
        // "filterTags": ["ckan_test"],
        // "filterGroups": ["ckan_test"],
        "dateFormat": "YYYY-MM-DD",
        "licenseId": "123",
        "licenseTitle": "ckan_titleID",
        "licenseUrl": "testing"
      }
    });
    cy.reload();
  }

  seedCswHarvester(id) {
    cy.request({
      method: 'POST',
      url: 'rest/api/harvester/' + id,
      body: {
        "id": parseInt(id),
        "disable": false,
        "type": "CSW",
        "description": "csw_test_api",
        "index": "csw_index",
        "httpMethod": "GET",
        "getRecordsUrl": "./testme",
        "defaultDCATCategory": ["SOCI"],
        "defaultMcloudSubgroup": ["railway"],
        "defaultAttribution": "attr_name",
        "defaultAttributionLink": "attr_link",
        "maxRecords": 150,
        "startPosition": 1
      }
    });
    cy.reload();
  }

  seedExcelHarvester(id) {
    cy.request({
      method: 'POST',
      url: 'rest/api/harvester/' + id,
      body: {
        "id": parseInt(id),
        "disable": false,
        "type": "EXCEL",
        "description": "excel_test_api",
        "index": "excel_index_api",
        "defaultDCATCategory": ["SOCI"],
        "defaultMcloudSubgroup": ["railway"],
        "defaultAttribution": "attr_name",
        "defaultAttributionLink": "attr_link",
        "maxRecords": 50,
        "startPosition": 1,
        "filePath": "./data.xlsx"
      }
    });
    cy.reload();
  }

}

export default HarvesterPage;
