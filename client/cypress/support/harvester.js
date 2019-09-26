/**
 * adds common fields
 */
function addCommon(options) {
  cy.get('[name="description"]').clear().type(options.description);
  cy.get('[name="index"]').clear().type(options.indexName);

  //if an option exists, it is added
  if (options.defaultDCATCategory) {
    addDefaultDCATCategory(options.defaultDCATCategory);
  }
  if (options.defaultmCLOUDCategory) {
    addDefaultmCLOUDCategory(options.defaultmCLOUDCategory);
  }
  if (options.defaultAttribution) {
    addDefaultAttribution(options.defaultAttribution);
  }
  if (options.defaultAttributionLink) {
    addDefaultAttributionLink(options.defaultAttributionLink);
  }
  if (options.maxRecords) {
    addMaxRecords(options.maxRecords);
  }
  if (options.startPosition) {
    addStartPosition(options.startPosition);
  }
}

//TODO what if more options exist
function addDefaultDCATCategory(defaultDCATCategory) {
  //not to click but selected
  cy.get('[name="defaultDCATCategory"]').click();
  cy.get('.mat-option-text').contains(defaultDCATCategory).click();
  cy.get('[name="defaultDCATCategory"]').type('{esc}');
}

function addDefaultmCLOUDCategory(defaultmCLOUDCategory) {
  //not to click but selected
  cy.get('[name="defaultmCLOUDCategory"]').click();
  cy.get('.mat-option-text').contains(defaultmCLOUDCategory).click();
  cy.get('[name="defaultmCLOUDCategory"]').type('{esc}');
}

function addDefaultAttribution(defaultAttribution) {
  cy.get('[name="defaultAttribution"]').clear().type(defaultAttribution);
}

function addDefaultAttributionLink(defaultAttributionLink) {
  cy.get('[name="defaultAttributionLink"]').clear().type(defaultAttributionLink);
}

function addMaxRecords(maxRecords) {
  cy.get('[name="maxRecords"]').clear().type(maxRecords);
}

function addStartPosition(startPosition) {
  cy.get('[name="startPosition"]').clear().type(startPosition);
}

/**
 * sets harvesters type and their own special required options
 */
function setCkanType(options) {
  cy.get('[name="type"]').click();
  cy.get('.mat-option-text').contains('CKAN').click();

  cy.get('[name="ckanBaseUrl"]').clear().type(options.ckanBasisUrl);
}

function setCswType(options) {
  cy.get('[name="type"]').click();
  cy.get('.mat-option-text').contains('CSW').click();
  cy.get('[name="httpMethod"]').click();
  cy.get('.mat-option-text').contains(options.httpMethod).click();
  cy.get('[name="getRecordsUrl"]').clear().type(options.getRecordsUrl);
}

function setExcelType(options) {
  cy.get('[name="type"]').click();
  cy.get('.mat-option-text').contains('EXCEL').click();
  cy.get('[name="filepath"]').clear().type(options.path);
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

//little temporary workaround, update an existing ckan without setting the type
Cypress.Commands.add('fillExistingCkanHarvester', (options) => {
  addCommon(options);
});

Cypress.Commands.add('fillExcelHarvester', (options) => {
  setExcelType(options);
  addCommon(options);
});
