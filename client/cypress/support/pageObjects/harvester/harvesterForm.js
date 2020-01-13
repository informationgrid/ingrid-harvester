class HarvesterForm {

  saveHarvesterBtn = '[data-test="dlg-update"]';

  type = '[formcontrolname="type"]';
  description = '[formcontrolname="description"]';
  indexName = '[formcontrolname="index"]';
  defaultDCATCategory = '[formcontrolname="defaultDCATCategory"]';
  defaultmCLOUDCategory = '[formcontrolname="defaultMcloudSubgroup"]';
  defaultAttribution = '[formcontrolname="defaultAttribution"]';
  defaultAttributionLink = '[formcontrolname="defaultAttributionLink"]';
  maxRecords = '[formcontrolname="maxRecords"]';
  startPosition = '[formcontrolname="startPosition"]';
  filterTag = 'input[placeholder="Filter Tags"]';
  filterGroups = 'input[placeholder="Filter Groups"]';
  dateFormat = 'input[placeholder="Datumsformate"]';
  licenseId = 'input[placeholder="ID"]';
  licenseTitle = 'input[placeholder="Titel"]';
  licenseUrl = 'input[placeholder="URL"]';

  ckanBasisUrl = '[formcontrolname="ckanBaseUrl"]';
  httpMethod = '[formcontrolname="httpMethod"]';
  getRecordsUrl = '[formcontrolname="getRecordsUrl"]';
  recordFilter = '[formcontrolname="recordFilter"]';
  keywords = '[placeholder="Either keywords"]';
  excelFilePath = '[formcontrolname="filePath"]';

  saveHarvesterConfig() {
    cy.get(this.saveHarvesterBtn).click();
    cy.wait(500);
  }

  /**
   * close the form without saving
   */
  closeHarvesterForm() {
    cy.get(this.type).type('{esc}');
  }

  setFields(options) {
    Object.keys(options).forEach(key => {
      const type = this.getTypeFromOptionKey(key);
      switch (type) {
        case 'input':
          // for text inputs
          cy.wait(500);
          cy.get(this[key]).clear().type(options[key]);
          break;
        case 'select':
          cy.wait(500);
          cy.get(this[key]).click();
          cy.get('.mat-option-text').contains(options[key]).click();
          break;
        case 'multiselect':
          cy.wait(500);
          cy.get(this[key]).click();
          cy.get('.mat-option-text').contains(options[key]).click();
          cy.get(this[key]).type('{esc}');
          break;
        default:
          throw new Error('Type unknown: ' + type);
      }
    });
  }

  checkFields(options) {
    Object.keys(options).forEach(key => {
      const type = this.getTypeFromOptionKey(key);
      switch (type) {
        case 'input':
          cy.get(this[key]).should('have.value', options[key]);
          break;
        case 'multiselect':
          cy.get(this[key]).should('contain', options[key]);
          break;
        case 'select':
          cy.get(this[key] + ' .ng-star-inserted').should('contain', options[key]);
          break;
      }
    });
  }

  fieldIsDisabled(field) {
    cy.get(field).should('have.class', 'mat-select-disabled');
  }

  fieldContains(field, value, bool) {
    if (bool) {
      cy.get(field).should('contain', value);
    } else {
      cy.get(field).should('not.contain', value);
    }
  }

  fieldValueIs(field, value){
    cy.get(field).should('have.value', value);
  }

  fieldValueIsNot(field, value){
    cy.get(field).should('not.have.value', value);
  }

  btnIsEnabled(btn) {
    cy.get(btn).should('be.enabled');
  }

  btnIsDisabled(btn){
  cy.get(btn).should('be.disabled');
  }

  closeFormWithoutSaving() {
    cy.get('.mat-button-wrapper').contains('Abbrechen').click();
  }

  getTypeFromOptionKey(key) {
    switch (key) {
      case 'type':
      case 'httpMethod':
        return 'select';
      case 'defaultDCATCategory':
      case 'defaultmCLOUDCategory':
        return 'multiselect';
      default:
        return 'input';
    }
  }

  clearFilterField(){
    cy.get(this.recordFilter).clear();
  }
}

export default HarvesterForm;
