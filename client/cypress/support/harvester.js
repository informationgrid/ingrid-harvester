/**
 * sets harvesters type
 */
function setCkanType() {
  cy.get('[name="type"]').click();
  cy.get('.mat-option-text').contains('CKAN').click();
}

function setCswType() {
  cy.get('[name="type"]').click();
  cy.get('.mat-option-text').contains('CSW').click();
}

function setExcelType() {
  cy.get('[name="type"]').click();
  cy.get('.mat-option-text').contains('EXCEL').click();
}

/**
 * set all harvesters fields
 * required and non required fields are checked to ensure more flexibility in the tests
 */
function setHarvesterFields(options) {
  //required fields for every harvester
  if(options.description){
    cy.get('[name="description"]').clear().type(options.description);
  }
  if(options.indexName){
    cy.get('[name="index"]').clear().type(options.indexName);
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
  if(options.filterGroup) {
    setFilterGroups(options.filterGroup);
  }
  if(options.licenseId) {
    setDefaultLicenseId(options.licenseId);
  }
  if(options.titleId) {
    setDefaultLicenseTitle(options.titleId);
  }
  if(options.licenseUrl) {
    setDefaultLicenseUrl(options.licenseUrl);
  }
  if(options.dateFormat) {
    setDataFormats(options.dateFormat);
  }
}

//setters for common fields
function setDefaultDCATCategory(defaultDCATCategory) {
  //not to click but selected
  cy.get('[name="defaultDCATCategory"]').click();
  cy.get('.mat-option-text').contains(defaultDCATCategory).click();
  cy.get('[name="defaultDCATCategory"]').type('{esc}');
}

function setDefaultmCLOUDCategory(defaultmCLOUDCategory) {
  //not to click but selected
  cy.get('[name="defaultmCLOUDCategory"]').click();
  cy.get('.mat-option-text').contains(defaultmCLOUDCategory).click();
  cy.get('[name="defaultmCLOUDCategory"]').type('{esc}');
}

function setDefaultAttribution(defaultAttribution) {
  cy.get('[name="defaultAttribution"]').clear().type(defaultAttribution);
}

function setDefaultAttributionLink(defaultAttributionLink) {
  cy.get('[name="defaultAttributionLink"]').clear().type(defaultAttributionLink);
}

function setMaxRecords(maxRecords) {
  cy.get('[name="maxRecords"]').clear().type(maxRecords);
}

function setStartPosition(startPosition) {
  cy.get('[name="startPosition"]').clear().type(startPosition);
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
  cy.get('[name="ckanBaseUrl"]').clear().type(ckanBasisUrl);
}

function setCswHttpMethod(httpMethod) {
  cy.get('[name="httpMethod"]').click();
  cy.get('.mat-option-text').contains(httpMethod).click();
}

function setGetRecordsUrl(getRecordsUrl) {
  cy.get('[name="getRecordsUrl"]').clear().type(getRecordsUrl);
}

function setExcelPath(path) {
  cy.get('[name="filepath"]').clear().type(path);
}

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
  cy.get('#harvester-' + harvesterId + ' [data-test=edit]').click();
});

/**
 * press button for harvester update
 */
Cypress.Commands.add("saveHarvesterConfig", () => {
  cy.get('[data-test=dlg-update]').click();
  cy.wait(500);
});

/**
 * press button to update an old harvester
 */
Cypress.Commands.add("updateHarvester",() => {
  cy.get('[data-test=dlg-update]').click();
});

/**
 * open harvester and start import process
 * @param harvesterId
 */
Cypress.Commands.add("openAndImportHarvester", (harvesterId) => {
  cy.get('#harvester-' + harvesterId).click();
  cy.get('#harvester-' + harvesterId + ' [data-test=import]').click();
});

/**
 * open harvester and schedule page
 * @param harvesterId
 */
Cypress.Commands.add("openScheduleHarvester", (harvesterId) => {
  cy.get('#harvester-' + harvesterId).click();
  cy.get('#harvester-' + harvesterId + ' [data-test=schedule]').click();
});

/**
 * ONLY open log page of a harvester, an harvester should already be opened
 * @param harvesterId
 */
Cypress.Commands.add("openLog", (harvesterId) => {
  cy.get('#harvester-' + harvesterId + ' [data-test=log]', {timeout: 6000}).click();
});
