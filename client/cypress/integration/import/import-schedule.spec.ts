describe('Import cron pattern operations', () => {
  beforeEach(() => {
    if (!(window.localStorage.getItem('currentUser'))) {
      cy.apiLogin('admin', 'admin');
    }
  });

  xit('should plan an import, activate the auto-planning, check its execution and turn off the auto-planning', () => {
    cy.openScheduleHarvester("6");

    cy.get('[placeholder="* * * * *"]').clear().type('* * * * *');
    cy.get('[data-test=dlg-schedule]').click();

    cy.get('#harvester-6 [data-test=next-execution]').should('not.contain', 'wurde geändert');
    cy.get('#harvester-6 [data-test=next-execution]').should('not.contain', '');

    //turn off pattern
    cy.openScheduleHarvester("6");
    cy.get('#harvester-6 [data-test=schedule]').click();
    //press little x
    cy.get('#harvester-6 s[data-test=cron-reset]').click();
    cy.get('#harvester-6 [data-test=dlg-schedule]').click();
  });

  it('should not be able to input the cron pattern "* *? * * *" (the planning button should be disabled)', () => {
    cy.openScheduleHarvester("20");

    cy.get('[placeholder="* * * * *"]').clear().type('* *? * * *');
    cy.get('#harvester-20 [data-test=dlg-schedule]').should('be.disabled')
  });

  it('should reset cron expression if the right cancel button is pressed', () => {
    cy.get('#harvester-20').click();
    cy.get('#harvester-20 [data-test=schedule]').click();
    cy.get('[placeholder="* * * * *"]').clear().type('*');
    cy.get('[data-test=cron-reset]').click();

    cy.get(' .ng-star-inserted').should('contain', 'Planung ausschalten');
    cy.get('[data-test=dlg-schedule]').click();

    cy.get('#harvester-20 [data-test=next-execution]').should('contain', 'wurde geändert');

    cy.reload();
    cy.get('#harvester-20').click();
    cy.get('#harvester-20 [data-test=next-execution]').should('not.exist');
  });

  xit('should show cron pattern´s syntax examples when the info button in the planning page is pressed', () => {
    cy.get('#harvester-20').click();

    cy.get('#harvester-20 [data-test=schedule]').click();
    //need data-test attribute
    cy.get('#harvester-20 ').click();

    cy.get('._ngcontent-ueg-c25').should('contain', '*/5 * * * * Alle 5 Minuten');
    cy.get('._ngcontent-ueg-c25').should('contain', '45 8 * * * Täglich um 8:45 Uhr');
    cy.get('._ngcontent-ueg-c25').should('contain', '0 6-18/2 * * * Täglich zwischen 6 und 18 Uhr, alle 2h');
    cy.get('._ngcontent-ueg-c25').should('contain', '30 4 1 * 0,6 Um 4:30 Uhr am 1. Tag jeden Monats, Sa und So');
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
