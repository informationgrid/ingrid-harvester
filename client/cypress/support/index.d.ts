declare namespace Cypress {
  interface Chainable {

    /**
     * Login as a user
     * @example cy.login('max', 'mustermann')
     */
    login(username: string, password: string): Chainable

    fastLogin(username: string, password: string): Chainable

    /**
     * log out
     */
    logout(): Chainable

    /**
     * changes tab
     */
    goToConfig(): Chainable

    goToHarvester(): Chainable

    goToLog(): Chainable

    /**
     *adds harvester
     */
    addCommonFieldsHarvester(options: HarvesterCommonOptions): Chainable

    /**
     * Fill form with data for a CKAN harvester. If an option field is not set
     * then the form field is also not set.
     * @param options
     */
    fillCkanHarvester(options: HarvesterCommonOptions & HarvesterCkanOptions): Chainable

    fillCswHarvester(options: HarvesterCommonOptions & HarvesterCswOptions): Chainable

    fillExcelHarvester(options: HarvesterCommonOptions & HarvesterExcelOptions): Chainable

    fillExistingCkanHarvester(options: HarvesterCommonOptions & HarvesterCkanOptions): Chainable

    /**
     * update / modify harvester
     */

    /**
     * import commands
     */
    importAll(): Chainable

  }
}

/**
 * common options for all types of harvesters
 */
interface HarvesterCommonOptions {
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

/**
 * required option for excel harvester
 */
interface HarvesterExcelOptions {
  path?: string;
}

/**
 * required options for ckan harvester
 */
interface HarvesterCkanOptions {
  ckanBasisUrl?: string;
  filterTag?: string;
  filterGroup?: string;
  dateFormat?: string;
}

/**
 * required options for csw harvester
 */
interface HarvesterCswOptions {
  httpMethod?: 'GET' | 'POST';
  getRecordsUrl?: string;
  recordFilter?: string;
  keywords?: string;
}

// Convert this to a module instead of script (allows import/export)
//export {}
