describe('Import cron pattern operations', () => {
  beforeEach(() => {
    if (!(window.localStorage.getItem('currentUser'))) {
      cy.apiLogin('admin', 'admin');
    }
  });

  it('should plan an import, activate the auto-planning, check its execution and turn off the auto-planning', () => {
    cy.openScheduleHarvester("6");

    //schedule import to: every minute
    cy.get('[data-test="cron-input"]').clear().type('* * * * *');
    cy.get('[data-test=dlg-schedule]').click();

    cy.reload();
    cy.get('#harvester-6 [data-test=next-execution]').should('not.contain', 'wurde geändert');
    cy.get('#harvester-6 [data-test=next-execution]').should('not.contain', '');

    //turn off schedule
    cy.openScheduleHarvester("6");
    cy.get('[data-test=cron-reset]').click();
    cy.get('[data-test=dlg-schedule]').click();
  });

  it('should reset cron expression if the right cancel button is pressed', () => {
    cy.get('#harvester-20').click();
    cy.get('#harvester-20 [data-test=schedule]').click();
    cy.get('[data-test="cron-input"]').clear().type('*');
    cy.get('[data-test=cron-reset]').click();

    //next-execution is turned off
    cy.get(' .ng-star-inserted').should('contain', 'Planung ausschalten');
    cy.get('[data-test=dlg-schedule]').click();

    //no next-execution should be planned
    cy.reload();
    cy.get('#harvester-20').click();
    cy.get('#harvester-20 [data-test=next-execution]').should('not.exist');
  });

  it('should show cron pattern´s syntax examples when the info button in the planning page is pressed', () => {
    cy.get('#harvester-20').click();
    cy.get('#harvester-20 [data-test=schedule]').click();
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

  it('should not import if schedule is off', () => {
    cy.get('#harvester-6').click();

    //no schedule is set
    cy.get('#harvester-6 [data-test=next-execution]').should('contain', 'deaktiviert');

    const importsDate = Cypress.moment().format('DD.MM.YY, HH:mm');
    const nextImport = Cypress.moment(importsDate).add(1, 'minute');
    //check no import is executed during a minute
    cy.get('#harvester-6 [data-test=last-execution]', {timeout: 60000}).should('not.contain', nextImport);
  });

  it('should disable scheduling for a harvester', () => {
    cy.openScheduleHarvester('6');

    //by clearing the cron input
    cy.get('[data-test="cron-input"]').clear();
    cy.get('[data-test="dlg-schedule"]').click();
    cy.get('[data-test="next-execution"]').should('contain', 'deaktiviert');

    //set schedule
    cy.openScheduleHarvester('6');
    cy.get('[data-test="cron-input"]').clear().type('* * * * *');
    cy.get('[data-test=dlg-schedule]').click();

    //by pressing the reset button
    cy.openScheduleHarvester('6');
    cy.get('[data-test=cron-reset]').click();
    cy.get('[data-test="next-execution"]').should('contain', 'deaktiviert');
  });

  it('should be able to click the slide toggle bar and check the right icon is shown if scheduling is on', () => {
    // create a schedule for harvester
    cy.openScheduleHarvester("3");
    cy.get('[data-test="cron-input"]').clear().type('30 4 1 * 0,6');
    cy.get('[data-test=dlg-schedule]').click();

    cy.deactivateToggleBar('3');
    cy.get('#harvester-3 .mat-icon').should('contain', 'alarm_off');

    cy.activateToggleBar('3');
    cy.get('#harvester-3 .mat-icon').should('contain', 'alarm_on');
  });


  xit('should have a valid scheduling value if scheduling is active', () => {
    //scheduling button is also used for search >> wait for clarification
    cy.activateToggleBar('7');

    cy.get('#harvester-7 .mat-icon').then((value) => {
      if (value.text().includes('alarm_on')){
        cy.openScheduleHarvester('7');
        cy.get('[data-test="cron-input"]').should('not.contain', '');
        }
    });
  });

  xit('should activate a scheduled importer', () => {
  });

  xit('should deactivate a scheduled importer', () => {
  });

  xit('should not be able to activate a scheduled import without an active auto-scheduling', () => {
  });
});
