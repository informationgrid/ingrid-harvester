/**
 * press import all button
 */
Cypress.Commands.add('importAll', () => {
  cy.get('[data-test="import-all"]').click();
});

Cypress.Commands.add('deactivateSchedule', (harvesterId) => {
  cy.openScheduleHarvester(harvesterId);
  cy.get('[data-test="cron-input"]').clear();
  cy.get('[data-test=dlg-schedule]').click();
});

/**
 * activate search and scheduling of the given harvester
 */
Cypress.Commands.add('activateToggleBar', (harvesterId) => {
  cy.get('#harvester-' + harvesterId + ' .mat-icon').then((value) => {
    if (value.text().includes('alarm_off')) {
      cy.get('#harvester-' + harvesterId + ' .mat-slide-toggle-bar').click({force: true});
    }
  });
});

/**
 * deactivate toggle bar
 */
Cypress.Commands.add('deactivateToggleBar', (harvesterId) => {
  cy.get('#harvester-' + harvesterId + ' .mat-icon').then((value) => {
    if (value.text().includes('alarm_on')) {
      cy.get('#harvester-' + harvesterId + ' .mat-slide-toggle-bar').click({force: true});
    }
  });
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
