describe('Import cron pattern operations', () => {
  let Constants = require("../../support/constants");
  const constants = new Constants();

  const Authentication = require("../../support/pageObjects/auth");
  const auth = new Authentication();

  beforeEach(() => {
    auth.apiLoginWithUserCheck();
  });

  it('should plan an import, activate the auto-planning, check its execution and turn off the auto-planning', () => {
    cy.openScheduleHarvester(constants.CKAN_DB_ID);

    //schedule import to: every minute
    cy.get('[data-test="cron-input"]').clear().type('* * * * *');
    cy.get('[data-test=dlg-schedule]').click();

    cy.reload();
    cy.get('#harvester-' + constants.CKAN_DB_ID + ' [data-test=next-execution]').should('not.contain', 'wurde geändert');
    cy.get('#harvester-' + constants.CKAN_DB_ID + ' [data-test=next-execution]').should('not.contain', '');

    //turn off schedule
    cy.openScheduleHarvester(constants.CKAN_DB_ID);
    cy.get('[data-test=cron-reset]').click();
    cy.get('[data-test=dlg-schedule]').click();
  });

  it('should reset cron expression if the right cancel button is pressed', () => {
    cy.get('#harvester-' + constants.CKAN_TEST_ID).click();
    cy.get('#harvester-' + constants.CKAN_TEST_ID + ' [data-test=schedule]').click();
    cy.get('[data-test="cron-input"]').clear().type('*');
    cy.get('[data-test=cron-reset]').click();

    //next-execution is turned off
    cy.get(' .ng-star-inserted').should('contain', 'Planung ausschalten');
    cy.get('[data-test=dlg-schedule]').click();

    //no next-execution should be planned
    cy.reload();
    cy.get('#harvester-' + constants.CKAN_TEST_ID ).click();
    cy.get('#harvester-' + constants.CKAN_TEST_ID + ' [data-test=next-execution]').should('contain', 'deaktiviert');
    // cy.get('#harvester-3 [data-test=next-execution]').should('not.exist');
  });

  it('should show cron pattern´s syntax examples when the info button in the planning page is pressed', () => {
    cy.get('#harvester-' + constants.CKAN_TEST_ID).click();
    cy.get('#harvester-' + constants.CKAN_TEST_ID + ' [data-test=schedule]').click();
    cy.get('[data-test="cron-info"]').click();

    cy.get('.info > :nth-child(1) > span').should('contain', '*/5 * * * *');
    cy.get('.info > :nth-child(1)').should('contain', 'Alle 5 Minuten');

    cy.get('.info > :nth-child(2) > span').should('contain', '45 8 * * *');
    cy.get('.info > :nth-child(2)').should('contain', 'Täglich um 8:45 Uhr');

    cy.get('.info > :nth-child(3) > span').should('contain', '0 6-18/2 * * *');
    cy.get('.info > :nth-child(3)').should('contain', 'Täglich zwischen 6 und 18 Uhr, alle 2h');

    cy.get('.info > :nth-child(4) > span').should('contain', '30 4 1 * 0,6');
    cy.get('.info > :nth-child(4)').should('contain', 'Um 4:30 Uhr am 1. Tag jeden Monats, Sa und So');
  });

  it('should not import if the schedule is planned but off [BUG]', () => {
    //deactivate auto import
    cy.openScheduleHarvester(constants.CKAN_DB_ID);

    //schedule import to: every minute  | (every 10 sec 0/10 0 0 ? * * *)
    cy.get('[data-test="cron-input"]').clear().type('* * * * *');
    cy.get('[data-test=dlg-schedule]').click();

    cy.wait(500);
    cy.deactivateToggleBar(constants.CKAN_DB_ID);

    //no schedule should be executed
    cy.get('#harvester-' + constants.CKAN_DB_ID + ' [data-test=next-execution]').should('contain', 'deaktiviert');

    const importsDate = Cypress.moment().format('DD.MM.YY, HH:mm');
    const nextImport = Cypress.moment(importsDate, 'DD.MM.YY, HH:mm').add(1, 'minute').format('DD.MM.YY, HH:mm');
    //check no import is executed during a minute
    cy.wait(60000);
    cy.get('#harvester-' + constants.CKAN_DB_ID + ' [data-test=last-execution]').should('not.contain', nextImport);

    //delete schedule
    cy.openScheduleHarvester(constants.CKAN_DB_ID);
    //schedule import to: every minute  | (every 10 sec 0/10 0 0 ? * * *)
    cy.get('[data-test="cron-input"]').clear();
    cy.get('[data-test=dlg-schedule]').click();
  });

  it('should disable scheduling for a harvester', () => {
    cy.openScheduleHarvester(constants.CKAN_DB_ID);

    //by clearing the cron input
    cy.get('[data-test="cron-input"]').clear();
    cy.get('[data-test="dlg-schedule"]').click();
    cy.get('[data-test="next-execution"]').should('contain', 'deaktiviert');

    //set schedule
    cy.openScheduleHarvester(constants.CKAN_DB_ID);
    cy.get('[data-test="cron-input"]').clear().type('* * * * *');
    cy.get('[data-test=dlg-schedule]').click();

    //by pressing the reset button
    cy.openScheduleHarvester(constants.CKAN_DB_ID);
    cy.get('[data-test=cron-reset]').click();
    cy.get('[data-test="next-execution"]').should('contain', 'deaktiviert');
  });

  it('should activate and deactivate a scheduled importer and check the right icon is shown', () => {
    // create a schedule for harvester
    cy.openScheduleHarvester(constants.CKAN_TEST_ID);
    cy.get('[data-test="cron-input"]').clear().type('30 4 1 * 0,6');
    cy.get('[data-test=dlg-schedule]').click();

    cy.deactivateToggleBar(constants.CKAN_TEST_ID);
    cy.get('#harvester-' + constants.CKAN_TEST_ID + ' .mat-icon').should('contain', 'alarm_off');

    cy.activateToggleBar(constants.CKAN_TEST_ID);
    cy.get('#harvester-' + constants.CKAN_TEST_ID + ' .mat-icon').should('contain', 'alarm_on');
  });

  xit('should have a valid scheduling value if scheduling is active', () => {
    //scheduling button is also used for search >> wait
    cy.activateToggleBar(constants.EXCEL_MCLOUD_ID);

    cy.get('#harvester-' + constants.EXCEL_MCLOUD_ID + ' .mat-icon').then((value) => {
      if (value.text().includes('alarm_on')){
        cy.openScheduleHarvester(constants.EXCEL_MCLOUD_ID);
        cy.get('[data-test="cron-input"]').should('not.contain', '');
        }
    });
  });

  xit('should not be able to activate a scheduled import without an active auto-scheduling', () => {
    //scheduling button is also used for search >> wait
  });
});
