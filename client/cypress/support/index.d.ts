declare namespace Cypress {
  interface Chainable {
    restoreLocalStorageCache(): Chainable
    saveLocalStorageCache(): Chainable
  }
}

/**
 * options for all harvesters
 */
interface HarvesterOptions {
  excelFilePath?: string; //excel

  ckanBasisUrl?: string; //ckan
  filterTag?: string;
  filterGroups?: string;
  dateFormat?: string;
  licenseId?: string;
  licenseTitle?: string;
  licenseUrl?: string;

  httpMethod?: 'GET' | 'POST'; //csw
  getRecordsUrl?: string;
  recordFilter?: string;
  keywords?: string;

  //required fields
  type?: 'CKAN' | 'CSW' | 'EXCEL';
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
