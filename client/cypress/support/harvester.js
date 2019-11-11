/**
 * sets harvesters type
 */
function setCkanType() {
  cy.get('[formcontrolname="type"]').click();
  cy.get('.mat-option-text').contains('CKAN').click();
}

function setCswType() {
  cy.get('[formcontrolname="type"]').click();
  cy.get('.mat-option-text').contains('CSW').click();
}

function setExcelType() {
  cy.get('[formcontrolname="type"]').click();
  cy.get('.mat-option-text').contains('EXCEL').click();
}

/**
 * set all harvesters fields
 * required and non required fields are checked to ensure more flexibility in the tests
 */
function setHarvesterFields(options) {
  //required fields for every harvester
  if (options.description) {
    cy.get('[formcontrolname="description"]').clear().type(options.description);
  }

  if (options.indexName) {
    cy.get('[formcontrolname="index"]').clear().type(options.indexName);
  }

  //required fields depending on type
  if (options.ckanBasisUrl) { //ckan
    setCkanBasisUrl(options.ckanBasisUrl);
  }

  if (options.httpMethod) { //csw
    setCswHttpMethod(options.httpMethod);
  }

  if (options.getRecordsUrl) {
    setGetRecordsUrl(options.getRecordsUrl);
  }

  if (options.recordFilter) {
    setRecordFilter(options.recordFilter);
  }

  if (options.keywords) {
    setKeywords(options.keywords);
  }

  if (options.path) { //excel
    setExcelPath(options.path);
  }

  //non required fields
  if (options.defaultDCATCategory) {
    setDefaultDCATCategory(options.defaultDCATCategory);
  }

  if (options.defaultmCLOUDCategory) {
    setDefaultmCLOUDCategory(options.defaultmCLOUDCategory);
  }

  if (options.defaultAttribution) {
    setDefaultAttribution(options.defaultAttribution);
  }

  if (options.defaultAttributionLink) {
    setDefaultAttributionLink(options.defaultAttributionLink);
  }

  if (options.maxRecords) {
    setMaxRecords(options.maxRecords);
  }

  if (options.startPosition) {
    setStartPosition(options.startPosition);
  }

  if (options.filterTag) {
    setFilterTags(options.filterTag);
  }

  if (options.filterGroup) {
    setFilterGroups(options.filterGroup);
  }

  if (options.licenseId) {
    setDefaultLicenseId(options.licenseId);
  }

  if (options.titleId) {
    setDefaultLicenseTitle(options.titleId);
  }

  if (options.licenseUrl) {
    setDefaultLicenseUrl(options.licenseUrl);
  }

  if (options.dateFormat) {
    setDataFormats(options.dateFormat);
  }
}

//setters for common fields
function setDefaultDCATCategory(defaultDCATCategory) {
  //not to click but selected
  cy.get('[formcontrolname="defaultDCATCategory"]').click();
  cy.get('.mat-option-text').contains(defaultDCATCategory).click();
  cy.get('[formcontrolname="defaultDCATCategory"]').type('{esc}');
}

function setDefaultmCLOUDCategory(defaultmCLOUDCategory) {
  //not to click but selected
  cy.get('[formcontrolname="defaultMcloudSubgroup"]').click();
  cy.get('.mat-option-text').contains(defaultmCLOUDCategory).click();
  cy.get('[formcontrolname="defaultMcloudSubgroup"]').type('{esc}');
}

function setDefaultAttribution(defaultAttribution) {
  cy.get('[formcontrolname="defaultAttribution"]').clear().type(defaultAttribution);
}

function setDefaultAttributionLink(defaultAttributionLink) {
  cy.get('[formcontrolname="defaultAttributionLink"]').clear().type(defaultAttributionLink);
}

function setMaxRecords(maxRecords) {
  cy.get('[formcontrolname="maxRecords"]').clear().type(maxRecords);
}

function setStartPosition(startPosition) {
  cy.get('[formcontrolname="startPosition"]').clear().type(startPosition);
}

function setFilterTags(filterTag) {
  cy.get('[placeholder="Filter Tags"]').type(filterTag);
}

function setFilterGroups(filterGroup) {
  cy.get('[placeholder="Filter Groups"]').type(filterGroup);
}

function setDataFormats(dataFormat) {
  cy.get('[placeholder="Datumsformate"]').type(dataFormat);
}

function setDefaultLicenseId(licenseId) {
  cy.get('[placeholder="ID"]').type(licenseId);
}

function setDefaultLicenseTitle(titleId) {
  cy.get('[placeholder="Titel"]').type(titleId);
}

function setDefaultLicenseUrl(urlId) {
  cy.get('[placeholder="URL"]').type(urlId);
}

//setters for required fields depending on harvester-type
function setCkanBasisUrl(ckanBasisUrl) {
  cy.get('[formcontrolname="ckanBaseUrl"]').clear().type(ckanBasisUrl);
}

function setCswHttpMethod(httpMethod) {
  cy.get('[formcontrolname="httpMethod"]').click();
  cy.get('.mat-option-text').contains(httpMethod).click();
}

function setGetRecordsUrl(getRecordsUrl) {
  cy.get('[formcontrolname="getRecordsUrl"]').clear().type(getRecordsUrl);
}

function setRecordFilter(recordFilter) {
  cy.get('[formcontrolname="recordFilter"]').type(recordFilter);
}

function setKeywords(keywords) {
  cy.get('[placeholder="Either keywords"]').type(keywords);
}

function setExcelPath(path) {
  cy.get('[formcontrolname="filePath"]').clear().type(path);
}

/**
 * field-check of an harvester
 */
function checkFields(options) {

  if (options.description) {
    cy.get('[formcontrolname="description"]').should('have.value', options.description);
  }

  if (options.indexName) {
    cy.get('[formcontrolname="index"]').should('have.value', options.indexName);
  }

  if (options.ckanBasisUrl) {
    cy.get('[formcontrolname="ckanBaseUrl"]').should('have.value', options.ckanBasisUrl);
  }

  if (options.httpMethod) { //csw
    cy.get('[formcontrolname="httpMethod"] .ng-star-inserted').should('contain', options.httpMethod);
  }

  if (options.getRecordsUrl) {
    cy.get('[formcontrolname="getRecordsUrl"]').should('have.value', options.getRecordsUrl);
  }

  if (options.recordFilter){
    cy.get('[formcontrolname="recordFilter"]').should('have.value', options.recordFilter);
  }

  if (options.keywords){
    cy.get('[placeholder="Either keywords"]').should('contain', options.keywords);
  }

  if (options.path) { //excel
    cy.get('[formcontrolname="filePath"]').should('have.value', options.path);
  }

  //non required fields
  if (options.defaultDCATCategory) {
    cy.get('[formcontrolname="defaultDCATCategory"]').should('contain', options.defaultDCATCategory);
  }

  if (options.defaultmCLOUDCategory) {
    cy.get('[formcontrolname="defaultMcloudSubgroup"]').should('contain', options.defaultmCLOUDCategory);
  }

  if (options.defaultAttribution) {
    cy.get('[formcontrolname="defaultAttribution"]').should('have.value', options.defaultAttribution);
  }

  if (options.defaultAttributionLink) {
    cy.get('[formcontrolname="defaultAttributionLink"]').should('have.value', options.defaultAttributionLink);
  }

  if (options.maxRecords) {
    cy.get('[formcontrolname="maxRecords"]').should('have.value', options.maxRecords);
  }

  if (options.startPosition) {
    cy.get('[formcontrolname="startPosition"]').should('have.value', options.startPosition);
  }

  // if (options.filterTag) {
  //   cy.get('.mat-chip-list-wrapper').should('contain', options.filterTag);
  // }

  // if (options.filterGroup) {
  //   cy.get('.mat-chip-list-wrapper').should('have.value', options.filterGroup);
  // }

  if (options.licenseId) {
    cy.get('[placeholder="ID"]').should('have.value', options.licenseId);
  }

  if (options.titleId) {
    cy.get('[placeholder="Titel"]').should('have.value', options.titleId);
  }

  if (options.licenseUrl) {
    cy.get('[placeholder="URL"]').should('have.value', options.licenseUrl);
  }

  if (options.dateFormat) {
    cy.get('[placeholder="Datumsformate"]').should('have.value', options.dateFormat);
  }
}

function seedCkanHarvester() {
  cy.request({
    method: 'POST',
    url: 'rest/api/harvester/-1',
    body: {
      "id": 97,
      "disable": true,
      "type": "CKAN",
      "description": "ckan_test_api",
      "ckanBasisUrl": "ckan_basis_url",
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
      "titleId": "ckan_titleID",
      "licenseUrl": "testing"
    }
  });
}

function seedCswHarvester() {
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

function seedExcelHarvester() {
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

function deselectDCATCategory(category) {
  cy.get('[formcontrolname="defaultDCATCategory"]')
    .then((dcatCat) => {
      if (dcatCat.text().includes(category)) {
        cy.get('[formcontrolname="defaultDCATCategory"]').click();
        cy.get('.mat-option-text').contains(category).click();
        cy.get('[formcontrolname="defaultDCATCategory"]').type('{esc}');
      }
    });
}

function deselectMcloudCategory(category) {
  cy.get('[formcontrolname=defaultMcloudSubgroup]')
    .then((mcloudCat) => {
      if (mcloudCat.text().includes(category)) {
        cy.get('[formcontrolname="defaultMcloudSubgroup"]').click();
        cy.get('.mat-option-text').contains(category).click();
        cy.get('[formcontrolname="defaultMcloudSubgroup"]').type('{esc}');
      }
    })
}

Cypress.Commands.add('deselectDCATCategory', (category) => {
  deselectDCATCategory(category);
});

Cypress.Commands.add('deselectMcloudCategory', (category) => {
  deselectMcloudCategory(category);
});

Cypress.Commands.add('checkFields', (options) => {
  checkFields(options);
});

Cypress.Commands.add('seedHarvester', () => {
  seedCkanHarvester();
  seedCswHarvester();
  seedExcelHarvester();

  cy.request({
    method: 'GET',
    url: 'rest/api/harvester'
  });
});

/**
 * create a new harvester of given type
 */
Cypress.Commands.add('newCkanHarvester', (options) => {
  setCkanType(options);
  setHarvesterFields(options);
});

Cypress.Commands.add('newCswHarvester', (options) => {
  setCswType(options);
  setHarvesterFields(options);
});

Cypress.Commands.add('newExcelHarvester', (options) => {
  setExcelType(options);
  setHarvesterFields(options);
});

/**
 * sets harvester values
 */
Cypress.Commands.add('setHarvesterFields', (options) => {
  setHarvesterFields(options);
});

/**
 * press button for adding a new harvester
 */
Cypress.Commands.add("addNewHarvester", () => {
  cy.get('#btnAddHarvester').click();
});

/**
 * press button for opening an existing harvester with given ID and updates it
 */
Cypress.Commands.add("openHarvester", (harvesterId) => {
  cy.get('#harvester-' + harvesterId).click();
  // cy.get('#harvester-' + harvesterId).click();
  cy.get('#harvester-' + harvesterId + ' [data-test="edit"]').click();
});

Cypress.Commands.add('openHarvesterByName', (harvesterName) => {
  cy.get('.no-wrap').contains(harvesterName).click();
  cy.get('[data-test="edit"]:visible').click();
});

/**
 * press button for harvester update
 */
Cypress.Commands.add("saveHarvesterConfig", () => {
  cy.get('[data-test="dlg-update"]').click();
  cy.wait(500);
});

/**
 * press button to update an old harvester
 */
Cypress.Commands.add("updateHarvester", () => {
  cy.get('[data-test="dlg-update"]').click();
});

/**
 * open harvester and start import process
 * @param harvesterId
 */
Cypress.Commands.add("openAndImportHarvester", (harvesterId) => {
  cy.get('#harvester-' + harvesterId).click();
  cy.get('#harvester-' + harvesterId + ' [data-test="import"]').click();
});

/**
 * open harvester and schedule page
 * @param harvesterId
 */
Cypress.Commands.add("openScheduleHarvester", (harvesterId) => {
  cy.get('#harvester-' + harvesterId).click();
  cy.get('#harvester-' + harvesterId + ' [data-test="schedule"]').click();
});

/**
 * ONLY open log page of a harvester, an harvester should already be opened
 * @param harvesterId
 */
Cypress.Commands.add("openLog", (harvesterId) => {
  cy.get('#harvester-' + harvesterId + ' [data-test="log"]', {timeout: 6000}).click();
});
