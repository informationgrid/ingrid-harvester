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
  numErrors = '[data-test="num-errors"]';
  nextExecution = '[data-test="next-execution"]';
  lastExecution = '[data-test="last-execution"]';
  cronInfo = '[data-test="cron-info"]';
  cronToggleBar = '[title="Planung an- / ausschalten"]';

  visit() {
    cy.visit('harvester');
  }

  // TODO: why another function? Can be used directly in test
  wait(ms) {
    cy.wait(ms);
  }

  // TODO: why another function? Can be used directly in test
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

  clickHarvesterById(id) {
    cy.get('#harvester-' + id).click();
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

  importHarvesterById(id) {
    cy.get('#harvester-' + id).click();
    cy.get('#harvester-' + id + ' ' + this.importBtn).click();
  }

  deleteHarvesterById(id) {
    cy.get('#harvester-' + id).click();
    cy.get('#harvester-' + id + ' ' + this.deleteHarvesterBtn).click();
    cy.get('.mat-button-wrapper').contains('Löschen').click();
  }

  checkImportHasStarted() {
    cy.get('.mat-simple-snackbar', {timeout: 60000}).should('contain', 'Import gestartet');
    cy.get('app-importer-detail').should('contain', ' Import läuft ');
  }

  checkImportDate(id, importsDate) {
    cy.get('#harvester-' + id + ' [data-test=last-execution]', {timeout: 15000}).should('contain', importsDate)
  }

  checkImportAllMsg() {
    cy.get('.mat-simple-snackbar').should('contain', 'Import von allen Harvestern gestartet');
  }

  // TODO: too complex! This should only open the dialog but not expand the harvester. When we call this function we don't expect
  //       the harvester to be expanded.
  openScheduleDialog(id) {
    cy.get('#harvester-' + id).click();
    cy.wait(500);
    cy.get('#harvester-' + id + ' ' + this.scheduleBtn).click();
  }

  applyScheduleDialog() {
    cy.get(this.setScheduleBtn).click();
    this.wait(500); // give time to save settings
  }

  setScheduleTo(id, pattern) {
    this.openScheduleDialog(id);
    cy.get(this.cronInputField).clear().type(pattern);
    this.activateScheduler();
    this.applyScheduleDialog();
  }

  activateScheduler() {
    cy.get(this.cronToggleBar).then(toggle => {
      if (!toggle.hasClass('mat-checked')) {
        cy.get(toggle).click();
      }
    })
  }

  deactivateScheduler() {
    cy.get(this.cronToggleBar).then(toggle => {
      if (toggle.hasClass('mat-checked')) {
        cy.get(toggle).click();
      }
    })
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

  errorLogHasMsg(msg) {
    cy.get(this.logContainer).should('contain', msg);
  }

  openElasticSearchLog() {
    cy.get(this.labelContent).contains('Elasticsearch-Errors').click();
  }

  // TODO: too complex! We don't expect from this function that the dialog will be closed
  clearCronInput(id) {
    cy.get(this.cronInputField).clear();
    cy.get(this.setScheduleBtn).click();
  }

  checkNoErrors(id) {
    cy.get('#harvester-' + id + ' ' + this.numErrors, {timeout: 10000})
      .invoke('text')
      .then((numErr) => {
          expect(numErr).to.equal('0');
        }
      )
  }

  nextExecutionContains(id, msg, mustContain) {
    if (mustContain) {
      cy.get('#harvester-' + id + ' ' + this.nextExecution).should('contain', msg);
    } else {
      cy.get('#harvester-' + id + ' ' + this.nextExecution).should('not.contain', msg);
    }
  }

  lastExecutionContains(id, msg, mustContain) {
    if (mustContain) {
      cy.get('#harvester-' + id + ' ' + this.lastExecution).should('contain', msg);
    } else {
      cy.get('#harvester-' + id + ' ' + this.lastExecution).should('not.contain', msg);
    }
  }

  getCronInfo(id) {
    this.openScheduleDialog(id);
    cy.get(this.cronInfo).click();
  }

  // TODO: too detailed! If one example changes the whole test will fail. It is enough to just check that some info is shown
  //       and then we probably don't need this function anymore and can be included in the ONE test
  checkCronInfos() {
    cy.get('.info > :nth-child(1) > span').should('contain', '*/5 * * * *');
    cy.get('.info > :nth-child(1)').should('contain', 'Alle 5 Minuten');

    cy.get('.info > :nth-child(2) > span').should('contain', '45 8 * * *');
    cy.get('.info > :nth-child(2)').should('contain', 'Täglich um 8:45 Uhr');

    cy.get('.info > :nth-child(3) > span').should('contain', '0 6-18/2 * * *');
    cy.get('.info > :nth-child(3)').should('contain', 'Täglich zwischen 6 und 18 Uhr, alle 2h');

    cy.get('.info > :nth-child(4) > span').should('contain', '30 4 1 * 0,6');
    cy.get('.info > :nth-child(4)').should('contain', 'Um 4:30 Uhr am 1. Tag jeden Monats, Sa und So');
  }

  seedCkanHarvester() {
    cy.request({
      method: 'POST',
      url: 'rest/api/harvester/-1',
      body: {
        "id": 97,
        "disable": true,
        "type": "CKAN",
        "description": "ckan_test_api",
        "ckanBaseUrl": "./testme",
        "index": "ckan_index",
        "defaultDCATCategory": ["SOCI"],
        "defaultMcloudSubgroup": ["railway"],
        "defaultAttribution": "attr_name",
        "defaultAttributionLink": "attr_link",
        "maxRecords": 50,
        "startPosition": 1,
        "filterTag": "ckan_test",
        "filterGroup": "ckan_test",
        "dateFormat": "YYYY-MM-DD",
        "licenseId": "123",
        "licenseTitle": "ckan_titleID",
        "licenseUrl": "testing"
      }
    });
  }

  seedCswHarvester() {
    cy.request({
      method: 'POST',
      url: 'rest/api/harvester/-1',
      body: {
        "id": 98,
        "disable": true,
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
  }

  seedExcelHarvester() {
    cy.request({
      method: 'POST',
      url: 'rest/api/harvester/-1',
      body: {
        "id": 99,
        "disable": true,
        "type": "EXCEL",
        "description": "excel_test_api",
        "index": "excel_index",
        "defaultDCATCategory": ["SOCI"],
        "defaultMcloudSubgroup": ["railway"],
        "defaultAttribution": "attr_name",
        "defaultAttributionLink": "attr_link",
        "maxRecords": 50,
        "startPosition": 1,
        "filePath": "./data.xlsx"
      }
    });
  }

}

export default HarvesterPage;
