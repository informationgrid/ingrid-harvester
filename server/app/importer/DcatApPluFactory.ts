/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

function optional(wrapper: string | Function, variable: any | any[]) {
    if (!variable) {
        return '';
    }
    if (Array.isArray(variable)) {
        if (typeof wrapper == 'string') {
            return variable.map(v => `<${wrapper}>${v}</${wrapper}>`).join('\n');
        }
        else {
            return variable.map(v => wrapper(v)).join(' ');
        }
    }
    else {
        return `<${wrapper}>${variable}</${wrapper}>`;
    }
}

interface Agent {
    name: string,
    type?: string
}

interface Catalog {
    description: string,
    homepage?: string,
    issued?: string,
    language?: string,
    modified?: string,
    publisher: Agent,
    records?: Record[],
    themeTaxonomy?: string,
    title: string
}

export interface Contact {
    address?: string,
    country?: string,
    email?: string,
    fn: string,
    locality?: string,
    orgName?: string,
    phone?: string,
    postalCode?: string,
    region?: string
}

interface Distribution {
    accessUrl: string, 
    description?: string, 
    downloadURL?: string, 
    format?: string, 
    issued?: string, 
    modified?: string, 
    period?: { start?: string, end?: string }, 
    pluDoctype?: string, 
    title?: string
}

interface ProcessStep {
    distributions?: any,
    identifier?: string,
    period?: { start?: string, end?: string },
    type: string
}

interface Record {
    issued?: string,
    modified?: string,
    primaryTopic: string,
    title: string
}
    
export interface DcatApPlu {
    bbox: string,
    catalog: Catalog, 
    contactPoint: Contact, 
    contributors?: Agent[],
    descriptions: string[], 
    distributions?: Distribution[],
    geographicName?: string,
    identifier: string,
    issued?: Date,
    lang: string,
    locationXml: string,
    maintainers?: Agent[],
    modified: Date,
    planState: string,
    pluPlanType?: string,
    pluPlanTypeFine?: string,
    pluProcedureState: string,
    pluProcedureType?: string,
    pluProcessSteps?: ProcessStep[],
    procedureStartDate: string,
    publisher: Agent,
    relation: string,
    title: string
}

// TODO
export const DCAT_AP_PLU_NSMAP = {
    DCAT: 'http://www.w3.org/ns/dcat#',
    DCT: 'http://purl.org/dc/terms/',
    FOAF: 'http://xmlns.com/foaf/0.1/',
    LOCN: 'http://www.w3.org/ns/locn#',
    PLU: '',
    RDF: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    VCARD: 'http://www.w3.org/2006/vcard/ns#'
};

/**
 * Codelist for procedureType (5.1)
 */
export const procedureType = {
    NORM_VERF: '1001',          // normales Verfahren
    VEREINF_VERF: '1002', 	    // vereinfachtes Verfahren
    BEBAU_PLAN_INNEN: '1003',	// Bebauungsplan der Innenentwicklung
    UNBEKANNT: '1004'           // unbekannt
};

/**
 * Codeliste Arten von Verfahren zur Aufstellung raumbezogener Planwerke (5.2)
 */
export const pluProcedureState = {
    GEPLANT: '2001',        // geplant
    LAUFEND: '2002',        // laufend
    ABGESCHLOSSEN: '2003',  // abgeschlossen
    UNBEKANNT: '2004'       // unbekannt
};

/**
 * Codeliste für Status eines Plans (5.3)
 */
export const pluPlanState = {
    IN_AUFST: '3001',   // in Aufstellung
    FESTGES: '3002',    // festgesetzt
    UNBEKANNT: '3004'   // unbekannt
};

/**
 * Codeliste für Arten von raumbezogenen Planwerken (5.4)
 */
export const pluPlantype = {
    BEBAU_PLAN: '1000',         // Bebauungsplan
    FLAECHENN_PLAN: '2000',     // Flächennutzungsplan
    STAEDT_BAUL_SATZ: '3000',   // städtebauliche Satzungen
    PW_BES_STAEDT_BAUR: '4000', // Planwerke besonderes Städtebaurecht
    PW_LANDSCH_PLAN: '5000',    // Planwerke der Landschaftsplanung
    RAUM_ORDN_PLAN: '6000',     // Raumordnungsplan
    RAUM_ORDN_VERF: '7000',     // Raumordnungsverfahren
    PLAN_FESTST_VERF: '8000',   // Planfeststellungsverfahren
    UNBEKANNT: '9000'           // unbekannt
};

/**
 * Codeliste für Arten von raumbezogenen Planwerken, detailliert (5.5)
 */
export const pluPlanTypeFine = {
    EINF_BEBAU_PLAN: '1100',    // Einfacher Bebauungsplan
    QUALI_BEBAU_PLAN: '1200',   // Qualifizierter Bebauungsplan
    TEIL_BEBAU_PLAN: '1300',    // Teilbebauungsplan
    VORH_BEBAU_PLA: '1400',     // Vorhabenbezogener Bebauungsplan
    DURCHF_PLAN: '1500',        // Durchführungsplan
    BAUSTF_PLAN: '1600',        // Baustufenplan
    FLUCHTL_PLAN: '1700',       // Fluchtlinienplan
    FLAECHENN_PLAN: '2000',     // Flächennutzungsplan
    GEMEINS_FLAECHENN_PLAN: '2100',     // Gemeinsamer Flächennutzungsplan
    REGION_FLAECHENN_PLAN: '2200',      // Regionaler Flächennutzungsplan
    STAEDT_BAUL_ERHALT_STZG: '3100',    // Städtebauliche Erhaltungssatzung
    STAEDT_BAUL_ENTWICKL_STZG: '3200',  // Städtebauliche Entwicklungssatzung
    STAEDT_BAUL_ERGAENZ_STZG: '3300',   // Städtebauliche Ergänzungssatzung
    STAEDT_BAUL_KLARST_STZG: '3400',    // Städtebauliche Klarstellungssatzung
    STAEDT_BAUL_INNENBER_STZG: '3500',  // Städtebauliche Innenbereichssatzung
    SICHER_FREMD_VERK_STZG:	'4100',     // Satzung zur Sicherung von Gebieten mit Fremdenverkehrsfunktion
    LANDSCH_PROG: '5100',   // Landschaftsprogramm
    LANDSCH_RAHMEN_PLAN: '5200',    // Landschaftsrahmenplan
    LANDSCH_PLAN: '5300',   // Landschaftsplan
    GRUEN_ORD_PLAN: '5400', // Grünordnungsplan
    REGION_PLAN: '6100',    // Regionalplan
    SACHL_TEIL_PLAN_REGIONAL: '6200',   // Sachlicher Teilplan Regionalebene
    SACHL_TEIL_PLAN_LAND: '6300',       // Sachlicher Teilplan Landesebene
    BRAUNK_PLAN: '6400',        // Braunkohlenplan
    LAND_RAUM_ORD_PLAN: '6500', // Landesweiter Raumordnungsplan
    STANDORT_KONZ_BUND: '6600', // Standortkonzept Bund
    AWZ_PLAN: '6700',           // AWZ Plan
    RAEUML_TEIL_PLAN: '6800',   // Räumlicher Teilplan
    UNBEKANNT: '7000'           // unbekannt
};

/**
 * Codeliste für Arten von Verfahrensschritten bei raumbezogenen Verfahren (5.6)
 */
export const pluProcessStepType = {
    FRUEHZ_BEH_BETEIL: '3001',   	// Frühzeitige Behördenbeteiligung
    FRUEHZ_OEFFTL_BETEIL: '3002', 	// Frühzeitige Öffentlichkeitsbeteiligung
    BETEIL_OEFFTL_TRAEGER: '3003', 	// Beteiligung der Träger öffentlicher Belange
    OEFFTL_AUSL: '3004', 	        // Öffentliche Auslegung
    INTERN_BEARB: '3005', 	        // Interne Bearbeitung
    ABGESCHLOSSEN: '3006'           // Abgeschlossen
};

/**
 * Codeliste für Arten von Dokumenten (5.7)
 */
export const pluDocType = {
    AUSLEG_INFO: '4001',    // Auslegungsinformationen
    ERLAEUT_BER: '4002', 	// Erläuterungsbericht
    PLAN_ZEICHN: '4003',	// Planzeichnung
    // TODO not finalized yet
};

export class DcatApPluFactory {

    static createXml({ bbox, catalog, contactPoint, contributors, descriptions, distributions, geographicName, identifier, issued, lang, locationXml, maintainers, modified, planState, pluPlanType, pluPlanTypeFine, pluProcedureState, pluProcedureType, pluProcessSteps, procedureStartDate, publisher, relation, title }: DcatApPlu): string {
        let xmlString = `<?xml version="1.0"?>
        <rdf:RDF ${Object.entries(DCAT_AP_PLU_NSMAP).map(([ns, uri]) => `xmlns:${ns.toLowerCase()}="${uri}"`).join(' ')}>
            <dcat:Catalog>
                <dct:description>${catalog.description}</dct:description>
                <dct:title>${catalog.title}</dct:title>
                ${DcatApPluFactory.xmlFoafAgent('dct:publisher', catalog.publisher)}
                ${optional('dcat:themeTaxonomy', catalog.themeTaxonomy)}
                ${optional('dct:issued', catalog.issued)}
                ${optional('dct:language', catalog.language)}
                ${optional('dct:modified', catalog.modified)}
                ${optional('foaf:homepage', catalog.homepage)}
                ${optional(DcatApPluFactory.xmlRecord, catalog.records)}
            </dcat:Catalog>
            <dcat:Dataset rdf:about="https://some.tld/features/${identifier}">
                ${DcatApPluFactory.xmlContact(contactPoint)}
                ${descriptions.map(description => `<dct:description xml:lang="${lang}">${description}</dct:description>`).join(' ')}
                <dct:identifier>${identifier}</dct:identifier>
                <dct:title xml:lang="${lang}">${title}</dct:title>
                <plu:PlanState>${planState}</plu:PlanState>
                <plu:pluProcedureState>${pluProcedureState}</plu:pluProcedureState>
                <plu:procedureStartDate>${procedureStartDate}</plu:procedureStartDate>
                <dct:spatial>
                    <dcat:Location>
                        <dcat:bbox>${bbox}</dcat:bbox>
                        <locn:geometry>${locationXml}</locn:geometry>
                        ${optional('dcat:centroid', '')}
                        ${optional('locn:geographicName', geographicName)}
                    </dcat:Location>
                </dct:spatial>
                ${DcatApPluFactory.xmlFoafAgent('dct:publisher', publisher)}
                ${optional((m: Agent) => DcatApPluFactory.xmlFoafAgent('dcatde:maintainer', m), maintainers)}
                ${optional((c: Agent) => DcatApPluFactory.xmlFoafAgent('dct:contributor', c), contributors)}
                ${optional(DcatApPluFactory.xmlDistribution, distributions)}
                ${optional('dct:issued', issued)}
                ${optional('dct:modified', modified)}
                ${optional('dct:relation', relation)}
                ${optional('plu:pluPlanType', pluPlanType)}
                ${optional('plu:pluPlanTypeFine', pluPlanTypeFine)}
                ${optional('plu:pluProcedureType', pluProcedureType)}
                ${optional(DcatApPluFactory.xmlProcessStep, pluProcessSteps)}
            </dcat:Dataset>
        </rdf:RDF>`;

        return xmlString.replace(/^\s*\n/gm, '');
    }

    private static xmlDistribution ({ accessUrl: accessURL, description, downloadURL, format, issued, modified, period, pluDoctype, title } : Distribution): string {
        return `<dcat:Distribution>
            <dcat:accessURL>${accessURL}</dcat:accessURL>
            ${optional('dct:description', description)}
            ${optional('dcat:downloadURL', downloadURL)}
            ${optional('dct:format', format)}
            ${optional('dct:issued', issued)}
            ${optional('dct:modified', modified)}
            ${optional(DcatApPluFactory.xmlPeriodOfTime, period)}
            ${optional('plu:pluDoctype', pluDoctype)}
            ${optional('dct:title', title)}
        </dcat:Distribution>`;
    }

    private static xmlFoafAgent(parent: string, { name, type }: Agent): string {
        return `<${parent}><foaf:agent>
            <foaf:name>${name}</foaf:name>
            ${optional('dct:type', type)}
        </foaf:agent></${parent}>`;
    }

    private static xmlPeriodOfTime({ start, end }: {start?: string, end?: string }): string {
        return `<dct:temporal>
            <dct:PeriodOfTime>
                ${optional('dcat:startDate', start)}
                ${optional('dcat:endDate', end)}
            </dct:PeriodOfTime>
        </dct:temporal>`;
    }

    private static xmlProcessStep({ distributions, identifier, period, type }: ProcessStep): string {
        return `<plu:PluProcessStep>
            <plu:ProcessStepType>${type}</plu:ProcessStepType>
            ${optional('dct:identifier', identifier)}
            ${optional(DcatApPluFactory.xmlDistribution, distributions)}
            ${optional(DcatApPluFactory.xmlPeriodOfTime, period)}
        </plu:PluProcessStep>`;
    }

    private static xmlRecord({ issued, modified, primaryTopic, title }: Record) {
        return `<dcat:record>
            <dcat:CatalogRecord>
                <dct:title>${title}</dct:title>
                <foaf:primaryTopic>${primaryTopic}</foaf:primaryTopic>
                ${optional('dct:issued', issued)}
                ${optional('dct:modified', modified)}
            </dcat:CatalogRecord>
        </dcat:record>`;
    }

    private static xmlContact({ address, country, email, fn, locality, orgName, phone, postalCode, region }: Contact): string {
        return `<dcat:contactPoint>
            <vcard:Organization>
                <vcard:fn>${fn}</vcard:fn>
                ${optional('vcard:organization-name', orgName)}
                ${optional('vcard:hasPostalCode', postalCode)}
                ${optional('vcard:hasStreetAddress', address)}
                ${optional('vcard:hasLocality', locality)}
                ${optional('vcard:hasRegion', region)}
                ${optional('vcard:hasCountryName', country)}
                ${optional('vcard:hasEmail', email)}
                ${optional('vcard:hasTelephoneNumber', phone)}
            </vcard:Organization>
        </dcat:contactPoint>`;
    }
}