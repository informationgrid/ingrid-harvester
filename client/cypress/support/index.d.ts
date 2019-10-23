declare namespace Cypress {
  interface Chainable {

    /**
     * Login as a user
     * @example cy.login('max', 'mustermann')
     */
    guiLogin(username: string, password: string): Chainable
    apiLogin(): Chainable
    // @DEPRECATED
    apiLogin(username: string, password: string): Chainable

    /**
     * log out
     */
    guiLogout(): Chainable
    apiLogout(): Chainable

    /**
     * changes tab
     */
    goToConfig(): Chainable
    goToHarvester(): Chainable
    goToLog(): Chainable

    /**
     * Fill form with data for a harvester.
     * If an option field is not set then the form field is also not set.
     * @param options
     */
    newCkanHarvester(options: HarvesterOptions): Chainable
    newCswHarvester(options: HarvesterOptions): Chainable
    newExcelHarvester(options: HarvesterOptions): Chainable

    /**
     * update a harvester
     */
    setHarvesterFields(options: HarvesterOptions): Chainable

    /**
     * import commands
     */
    importAll(): Chainable

    /**
     * Help functions for harvesters operations
     */
    addNewHarvester(): Chainable
    openHarvester(harvesterId: string): Chainable
    saveHarvesterConfig(): Chainable
    updateHarvester(): Chainable
    openAndImportHarvester(harvesterId: string): Chainable
    openScheduleHarvester(harvesterId: string): Chainable
    openLog(harvesterId: string): Chainable
  }
}

/**
 * common options for all types of harvesters
 */
interface HarvesterOptions {
  path?: string; //excel

  ckanBasisUrl?: string; //ckan
  filterTag?: string;
  filterGroup?: string;
  dateFormat?: string;

  httpMethod?: 'GET' | 'POST'; //csw
  getRecordsUrl?: string;
  recordFilter?: string;
  keywords?: string;

  //required fields
  description?: string;
  indexName?: string;
  //optional fields
  defaultDCATCategory?: 'Bevölkerung und Gesellschaft' | 'Bildung, Kultur und Sport' | 'Energie' | 'Gesundheit' | 'Internationale Themen'
    | 'Justiz, Rechtssystem und öffentliche Sicherheit' | 'Landwirtschaft, Fischerei, Forstwirtschaft und Nahrungsmittel'
    | 'Regierung und öffentlicher Sektor' | 'Regionen und Städte' | 'Umwelt' | 'Verkehr' | 'Vorläufige Daten'
    | 'Wirtschaft und Finanzen' | 'Wissenschaft und Technologie';
  defaultmCLOUDCategory?: 'Bahn' | 'Infrastruktur' | 'Klima und Wetter' | 'Gesundheit' | 'Luft- und Raumfahrt' | 'Straßen' | 'Wasserstraßen und Gewässer';
  defaultAttribution?: string;
  defaultAttributionLink?: string;
  maxRecords?: string;
  startPosition?: string;
}

// Convert this to a module instead of script (allows import/export)
//export {}
