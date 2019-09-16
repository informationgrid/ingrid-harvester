declare namespace Cypress {
  interface Chainable {

    /**
     * Custom command to select DOM element by data-cy attribute.
     * @example cy.login('max', 'mustermann')
     */
    login(username: string, password: string): Chainable

    /**
     *
     * @param options
     */
    addHarvester(options: HarvesterOptions): Chainable
  }
}

interface HarvesterOptions {
  type: 'EXCEL' | 'CKAN' | 'CSW';
  description: string;
}

// Convert this to a module instead of script (allows import/export)
//export {}
