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

import { Agent, Contact, DateRange, Distribution, GenericMapper, Organization, Person } from "./generic.mapper";

function optional(wrapper: string | Function, variable: any | any[]) {
    if (!variable) {
        return '';
    }
    if (!Array.isArray(variable)) {
        variable = [variable];
    }
    if (typeof wrapper == 'string') {
        return variable.map(v => `<${wrapper}>${v}</${wrapper}>`).join('\n');
    }
    else {
        return variable.map(v => wrapper(v)).join(' ');
    }
}

export interface Catalog {
    description: string,
    homepage?: string,
    issued?: string,
    language?: string,
    modified?: string,
    publisher: Person | Organization,
    records?: Record[],
    themeTaxonomy?: string,
    title: string
}

export interface ProcessStep {
    distributions?: Distribution[],
    identifier?: string,
    period?: DateRange,
    type: typeof pluProcessStepType[keyof typeof pluProcessStepType];
}

interface Record {
    issued?: string,
    modified?: string,
    primaryTopic: string,
    title: string
}

export interface DcatApPlu {
    bboxGml: string,
    catalog: Catalog,
    centroid: number[],
    contactPoint: Contact,
    contributors?: Agent[],
    descriptions: string[],
    distributions?: Distribution[],
    geographicName?: string,
    identifier: string,
    issued?: Date,
    lang: string,
    geometryGml: string,
    maintainers?: Agent[],
    modified: Date,
    planState: string,
    pluPlanType?: string,
    pluPlanTypeFine?: string,
    pluProcedureState: string,
    pluProcedureType?: string,
    pluProcessSteps?: ProcessStep[],
    procedureStartDate: string,
    publisher: Person | Organization,
    relation: string,
    title: string
}

export const DCAT_AP_PLU_NSMAP = {
    DCAT: 'http://www.w3.org/ns/dcat#',
    DCT: 'http://purl.org/dc/terms/',
    FOAF: 'http://xmlns.com/foaf/0.1/',
    GML: 'http://www.opengis.net/gml/3.2',
    LOCN: 'http://www.w3.org/ns/locn#',
    PLU: 'http://a.placeholder.url.for.dcat-ap-plu',    // TODO
    RDF: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    VCARD: 'http://www.w3.org/2006/vcard/ns#'
};

/**
 * Codeliste Arten von Verfahren zur Aufstellung raumbezogener Planwerke (5.1)
 */
export const pluProcedureType = {
    NORM_VERF: '1001',          // normales Verfahren
    VEREINF_VERF: '1002', 	    // vereinfachtes Verfahren
    BEBAU_PLAN_INNEN: '1003',	// Bebauungsplan der Innenentwicklung
    UNBEKANNT: '1004'           // unbekannt
};

/**
 * Codeliste für übergeordneten Status eines Verfahrens (5.2)
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

export class DcatApPluDocument {// no can do with TS: extends ExportDocument {

    static getExportFormat() {
        return 'dcat-ap-plu';
    }

    static async create(mapper: GenericMapper): Promise<string> {
        let catalog = await mapper.getCatalog();
        let centroid = mapper.getCentroid();
        let contributors = null;    // TODO
        let maintainers = null;     // TODO
        let relation = null;        // TODO
        let xmlString = `<?xml version="1.0"?>
        <rdf:RDF ${Object.entries(DCAT_AP_PLU_NSMAP).map(([ns, uri]) => `xmlns:${ns.toLowerCase()}="${uri}"`).join(' ')}>
            <dcat:Catalog>
                <dct:description>${catalog.description}</dct:description>
                <dct:title>${catalog.title}</dct:title>
                ${DcatApPluDocument.xmlFoafAgent('dct:publisher', catalog.publisher[0])}
                ${optional('dcat:themeTaxonomy', catalog.themeTaxonomy)}
                ${optional('dct:issued', catalog.issued)}
                ${optional('dct:language', catalog.language)}
                ${optional('dct:modified', catalog.modified)}
                ${optional('foaf:homepage', catalog.homepage)}
                ${optional(DcatApPluDocument.xmlRecord, catalog.records)}
            </dcat:Catalog>
            <dcat:Dataset>
                ${DcatApPluDocument.xmlContact(await mapper.getContactPoint())}
                <dct:description xml:lang="${catalog.language}">${mapper.getDescription()}</dct:description>
                <dct:identifier>${mapper.getGeneratedId()}</dct:identifier>
                <dct:title xml:lang="${catalog.language}">${mapper.getTitle()}</dct:title>
                <plu:planState>${mapper.getPluPlanState()}</plu:planState>
                <plu:procedureState>${mapper.getPluProcedureState()}</plu:procedureState>
                <plu:procedureStartDate>${mapper.getPluProcedureStartDate()}</plu:procedureStartDate>
                <dct:spatial>
                    <dcat:Location>
                        ${optional('dcat:bbox', mapper.getBoundingBoxGml())}
                        ${optional('locn:geometry', mapper.getSpatialGml())}
                        ${optional(DcatApPluDocument.xmlCentroid, centroid ? [centroid] : null)}
                        ${optional('locn:geographicName', mapper.getSpatialText())}
                    </dcat:Location>
                </dct:spatial>
                ${DcatApPluDocument.xmlFoafAgent('dct:publisher', (await mapper.getPublisher())[0])}
                ${optional(DcatApPluDocument.xmlDistribution, await mapper.getDistributions())}
                ${optional('dct:issued', mapper.getIssued())}
                ${optional('dct:modified', mapper.getModifiedDate())}
                ${optional('dct:relation', relation)}
                ${optional('plu:pluPlanType', mapper.getPluPlanType())}
                ${optional('plu:pluPlanTypeFine', mapper.getPluPlanTypeFine())}
                ${optional('plu:pluProcedureType', mapper.getPluProcedureType())}
                ${optional(DcatApPluDocument.xmlProcessStep, mapper.getPluProcessSteps())}
            </dcat:Dataset>
        </rdf:RDF>`;

        return xmlString.replace(/^\s*\n/gm, '');
    }

    private static xmlCentroid(centroid: number[]): string {
        return `<dcat:centroid>
            <gml:Point>
                <gml:pos>${centroid.join(' ')}</gml:pos>
            </gml:Point>
        </dcat:centroid>`;
    }

    private static xmlDistribution(distribution: Distribution): string {
        return `<dcat:Distribution>
            <dcat:accessURL>${distribution.accessURL}</dcat:accessURL>
            ${optional('dct:description', distribution.description)}
            ${optional('dcat:downloadURL', distribution.downloadURL)}
            ${optional('dct:format', distribution.format)}
            ${optional('dct:issued', distribution.issued)}
            ${optional('dct:modified', distribution.modified)}
            ${optional(DcatApPluDocument.xmlPeriodOfTime, distribution.period)}
            ${optional('plu:pluDoctype', distribution.pluDoctype)}
            ${optional('dct:title', distribution.title)}
        </dcat:Distribution>`;
    }

    private static xmlFoafAgent(parent: string, agent: Person | Organization): string {
        let name = (<Organization>agent)?.organization ?? (<Person>agent)?.name;
        return `<${parent}><foaf:agent>
            <foaf:name>${name}</foaf:name>
            ${optional('dct:type', agent.type)}
        </foaf:agent></${parent}>`;
    }

    private static xmlPeriodOfTime({ lte: start, gte: end }: DateRange): string {
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
            ${optional(DcatApPluDocument.xmlDistribution, distributions)}
            ${optional(DcatApPluDocument.xmlPeriodOfTime, period)}
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

    private static xmlContact(contact: Contact): string {
        // if fn is not set, use orgName instead; in this case, don't repeat orgName in an extra element
        let useFn = contact.fn && !['-'].includes(contact.fn);
        return `<dcat:contactPoint>
            <vcard:Organization>
                <vcard:fn>${useFn ? contact.fn : contact["organization-name"]}</vcard:fn>
                ${optional('vcard:organization-name', useFn ? contact["organization-name"] : null)}
                ${optional('vcard:hasAddress',
                    optional('vcard:postal-code', contact.hasAddress?.["postal-code"]) +
                    optional('vcard:street-address', contact.hasAddress?.["street-address"]) +
                    optional('vcard:locality', contact.hasAddress?.locality) +
                    optional('vcard:region', contact.hasAddress?.region) +
                    optional('vcard:country-name', contact.hasAddress?.["country-name"])
                )}
                ${optional('vcard:hasEmail', contact.hasEmail)}
                ${optional('vcard:hasTelephone', contact.hasTelephone)}
            </vcard:Organization>
        </dcat:contactPoint>`;
    }
}