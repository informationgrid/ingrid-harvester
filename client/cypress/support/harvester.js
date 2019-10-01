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


