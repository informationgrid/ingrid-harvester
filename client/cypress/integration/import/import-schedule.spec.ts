describe('Import cron pattern operations', () => {
  beforeEach(() => {
    if (!(window.localStorage.getItem('currentUser'))) {
      cy.apiLogin('admin', 'admin');
    }
  });

  it('should plan an import, activate the auto-planning, check its execution and turn off the auto-planning', () => {
    cy.openScheduleHarvester("6");

    cy.get('[data-test="cron-input"]').clear().type('* * * * *');
    cy.get('[data-test=dlg-schedule]').click();

    cy.reload();
    cy.get('#harvester-6 [data-test=next-execution]').should('not.contain', 'wurde geändert');
    cy.get('#harvester-6 [data-test=next-execution]').should('not.contain', '');

    //turn off pattern
    cy.openScheduleHarvester("6");
    //press little x
    cy.get('[data-test=cron-reset]').click();
    cy.get('[data-test=dlg-schedule]').click();
  });

  it('should not be able to input the cron pattern "* *? * * *" (the planning button should be disabled) [INPUT CONTROL]', () => {
    cy.openScheduleHarvester("20");

    cy.get('[data-test="cron-input"]').clear().type('* *? * * *');
    cy.get('[data-test=dlg-schedule]').should('be.disabled')
  });

  it('should reset cron expression if the right cancel button is pressed', () => {
    cy.get('#harvester-20').click();
    cy.get('#harvester-20 [data-test=schedule]').click();
    cy.get('[data-test="cron-input"]').clear().type('*');
    cy.get('[data-test=cron-reset]').click();

    cy.get(' .ng-star-inserted').should('contain', 'Planung ausschalten');
    cy.get('[data-test=dlg-schedule]').click();

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

  xit('should disable scheduling for a harvester', () => {
  });

  xit('should have a valid scheduling value if scheduling is active', () => {
  });

  xit('should activate a scheduled importer', () => {
  });

  xit('should deactivate a scheduled importer', () => {
  });

  xit('should not be able to activate a scheduled import without an active auto-scheduling', () => {
  });
});
