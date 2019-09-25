/**
 * adds common fields
 */
function addCommon(options) {
  cy.get('[name="description"]').type(options.description);
  cy.get('[name="index"]').type(options.indexName);

/*  cy.get('[name="defaultDCATCategory"]').click();
  cy.get('.mat-option-text').contains(options.defaultDCATCategory).click();
  cy.get('[name="defaultmCLOUDCategory"]').click();
  cy.get('.mat-option-text').contains(options.defaultmCLOUDCategory).click();
  cy.get('[name="defaultAttribution"]').type(options.defaultAttribution);
  cy.get('[name="defaultAttributionLink"]').type(options.defaultAttributionLink);
  cy.get('[name="maxRecords"]').type(options.maxRecords);
  cy.get('[name="startPosition"]').type(options.startPosition);*/
}

/**
 * sets harvesters type and their own special required options
 */
function setCkanType(options) {
  cy.get('[name="type"]').click();
  cy.get('.mat-option-text').contains('CKAN').click();

  cy.get('[name="ckanBaseUrl"]').type(options.ckanBasisUrl);
}

function setCswType(options) {
  cy.get('[name="type"]').click();
  cy.get('.mat-option-text').contains('CSW').click();
  cy.get('[name="httpMethod"]').click();
  cy.get('.mat-option-text').contains(options.httpMethod).click();
  cy.get('[name="getRecordsUrl"]').type(options.getRecordsUrl);
}

function setExcelType(options) {
  cy.get('[name="type"]').click();
  cy.get('.mat-option-text').contains('EXCEL').click();
  cy.get('[name="filepath"]').type(options.path);
}

/**
 * fills the fields of the harvesters
 */
Cypress.Commands.add('fillCkanHarvester', (options) => {
  setCkanType(options);
  addCommon(options);
  });

Cypress.Commands.add('fillCswHarvester', (options) => {
  setCswType(options);
  addCommon(options);
  });

Cypress.Commands.add('fillExcelHarvester', (options) => {
  setExcelType(options);
  addCommon(options);
  });
