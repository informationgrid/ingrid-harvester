/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

import { Contact, Organization, Person } from '../../../model/agent';
import { DateRange } from '../../../model/dateRange';
import { DiplanungCswMapper } from '../mapper/diplanung.csw.mapper';
import { DiplanungMapperFactory } from '../mapper/diplanung.mapper.factory';
import { Distribution } from '../../../model/distribution';
import { ExcelSparseMapper } from '../../../importer/excelsparse/excelsparse.mapper';
import { ProcessStep, Record } from '../../../model/dcatApPlu.model';
import { WfsMapper } from '../../../importer/wfs/wfs.mapper';

const esc = require('xml-escape');

function optional(wrapper: string | Function, variable: any | any[], ...remainder: any) {
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
        return variable.map(v => wrapper(v, remainder)).join(' ');
    }
}

// const DCAT_AP_PLU_NSMAP = {
//     dcat: 'http://www.w3.org/ns/dcat#',
//     dcatde: 'http://dcat-ap.de/def/dcatde/',
//     dct: 'http://purl.org/dc/terms/',
//     foaf: 'http://xmlns.com/foaf/0.1/',
//     gml: 'http://www.opengis.net/gml/3.2#',
//     locn: 'http://www.w3.org/ns/locn#',
//     plu: 'http://a.placeholder.url.for.dcat-ap-plu/',    // TODO
//     rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
//     vcard: 'http://www.w3.org/2006/vcard/ns#'
// };


export class DcatApPluDocument {// no can do with TS: extends ExportDocument {

    static getExportFormat() {
        return 'dcat_ap_plu';
    }

    static async create(_mapper: DiplanungCswMapper | ExcelSparseMapper | WfsMapper): Promise<string> {
        let mapper = DiplanungMapperFactory.getMapper(_mapper);
        let catalog = await mapper.getCatalog();
        let centroid = mapper.getCentroid();
        let publisher = await mapper.getPublisher()?.[0];
        let contributors = null;    // TODO
        let maintainers = await mapper.getMaintainers();
        let relation = null;        // TODO
        // let xmlString = `<?xml version="1.0"?>
        // <rdf:RDF ${Object.entries(DCAT_AP_PLU_NSMAP).map(([ns, uri]) => `xmlns:${ns}="${uri}"`).join(' ')}>
        //     <dcat:Catalog>
        //         <dct:identifier>${esc(catalog.identifier)}</dct:identifier>
        //         <dct:description>${esc(catalog.description)}</dct:description>
        //         <dct:title>${esc(catalog.title)}</dct:title>
        //         ${DcatApPluDocument.xmlFoafAgent('dct:publisher', catalog.publisher)}
        //         ${optional('dcat:themeTaxonomy', esc(catalog.themeTaxonomy))}
        //         ${optional('dct:issued', esc(catalog.issued))}
        //         ${optional('dct:language', esc(catalog.language))}
        //         ${optional('dct:modified', esc(catalog.modified))}
        //         ${optional('foaf:homepage', esc(catalog.homepage))}
        //         ${optional(DcatApPluDocument.xmlRecord, catalog.records)}
        //     </dcat:Catalog>`;
        let xmlString = `<dcat:Dataset rdf:about="https://portal.diplanung.de/planwerke/${esc(mapper.getGeneratedId())}">
                ${DcatApPluDocument.xmlContact(await mapper.getContactPoint(), catalog.publisher.name)}
                <dct:description>${esc(mapper.getDescription())}</dct:description>
                <dct:identifier>${esc(mapper.getGeneratedId())}</dct:identifier>
                <dct:title>${esc(mapper.getTitle())}</dct:title>
                <plu:planState>${mapper.getPluPlanState()}</plu:planState>
                <plu:procedureState>${mapper.getPluProcedureState()}</plu:procedureState>
                ${optional('plu:procedureStartDate', esc(mapper.getPluProcedureStartDate()))}
                <dct:spatial>
                    <dct:Location>
                        ${optional('dcat:bbox', mapper.getBoundingBoxGml())}
                        ${optional('locn:geometry', mapper.getSpatialGml())}
                        ${optional(DcatApPluDocument.xmlCentroid, centroid ? [centroid] : null)}
                        ${optional('locn:geographicName', esc(mapper.getSpatialText()))}
                    </dct:Location>
                </dct:spatial>
                ${DcatApPluDocument.xmlFoafAgent('dct:publisher', publisher)}
                ${optional(m => DcatApPluDocument.xmlFoafAgent('dcatde:maintainer', m), maintainers)}
                ${optional(c => DcatApPluDocument.xmlFoafAgent('dct:contributor', c), contributors)}
                ${optional(DcatApPluDocument.xmlDistribution, await mapper.getDistributions())}
                ${optional('dct:issued', mapper.getIssued())}
                ${optional('dct:modified', mapper.getModifiedDate())}
                ${optional('dct:relation', esc(relation))}
                ${optional(DcatApPluDocument.xmlPeriodOfTime, mapper.getPluDevelopmentFreezePeriod(), 'plu:developmentFreezePeriod')}
                ${optional('plu:planType', mapper.getPluPlanType())}
                ${optional('plu:planTypeFine', mapper.getPluPlanTypeFine())}
                ${optional('plu:procedureType', mapper.getPluProcedureType())}
                ${optional(DcatApPluDocument.xmlProcessStep, mapper.getPluProcessSteps())}
            </dcat:Dataset>`;
        // </rdf:RDF>`;

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
        return `<dcat:distribution>
            <dcat:Distribution>
                <dcat:accessURL>${esc(distribution.accessURL)}</dcat:accessURL>
                ${optional('dct:description', esc(distribution.description))}
                ${optional('dcat:downloadURL', esc(distribution.downloadURL))}
                ${optional('dct:format', esc(distribution.format?.[0]))}
                ${optional('dct:issued', distribution.issued)}
                ${optional('dct:modified', distribution.modified)}
                ${optional(DcatApPluDocument.xmlPeriodOfTime, distribution.period)}
                ${optional('plu:docType', esc(distribution.pluDocType))}
                ${optional('dct:title', esc(distribution.title))}
            </dcat:Distribution>
        </dcat:distribution>`;
    }

    private static xmlFoafAgent(parent: string, agent: Person | Organization): string {
        let name = (<Organization>agent)?.organization ?? (<Person>agent)?.name;
        return `<${parent}><foaf:Agent>
            <foaf:name>${esc(name)}</foaf:name>
            ${optional('dct:type', esc(agent?.type))}
        </foaf:Agent></${parent}>`;
    }

    private static xmlPeriodOfTime({ lte: start, gte: end }: DateRange, relation: string = 'dct:temporal'): string {
        return `<${relation}>
            <dct:PeriodOfTime>
                ${optional('dcat:startDate', start)}
                ${optional('dcat:endDate', end)}
            </dct:PeriodOfTime>
        </${relation}>`;
    }

    private static xmlProcessStep({ distributions, identifier, period, type }: ProcessStep): string {
        return `<plu:processStep>
            <plu:ProcessStep>
                <plu:processStepType>${type}</plu:processStepType>
                ${optional('dct:identifier', esc(identifier))}
                ${optional(DcatApPluDocument.xmlDistribution, distributions)}
                ${optional(DcatApPluDocument.xmlPeriodOfTime, period)}
            </plu:ProcessStep>
        </plu:processStep>`;
    }

    private static xmlRecord({ issued, modified, primaryTopic, title }: Record) {
        return `<dcat:record>
            <dcat:CatalogRecord>
                <dct:title>${esc(title)}</dct:title>
                <foaf:primaryTopic>${esc(primaryTopic)}</foaf:primaryTopic>
                ${optional('dct:issued', esc(issued))}
                ${optional('dct:modified', esc(modified))}
            </dcat:CatalogRecord>
        </dcat:record>`;
    }

    private static xmlContact(contact: Contact, backupFn: string): string {
        // if fn is not set, use orgName instead; in this case, don't repeat orgName in an extra element
        let useFn = contact.fn && !['-'].includes(contact.fn);
        return `<dcat:contactPoint>
            <vcard:Organization>
                <vcard:fn>${useFn ? esc(contact.fn) : esc(contact.hasOrganizationName) ?? esc(backupFn)}</vcard:fn>
                ${optional('vcard:hasOrganizationName', useFn ? contact.hasOrganizationName : null)}
                ${optional('vcard:hasPostalCode', esc(contact.hasPostalCode))}
                ${optional('vcard:hasStreetAddress', esc(contact.hasStreetAddress))}
                ${optional('vcard:hasLocality', esc(contact.hasLocality))}
                ${optional('vcard:hasRegion', esc(contact.hasRegion))}
                ${optional('vcard:hasCountryName', esc(contact.hasCountryName))}
                ${optional('vcard:hasEmail', esc(contact.hasEmail))}
                ${optional('vcard:hasTelephone', esc(contact.hasTelephone))}
            </vcard:Organization>
        </dcat:contactPoint>`;
    }
}