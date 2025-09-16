/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
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

import * as MiscUtils from '../../../utils/misc.utils.js';
import type { Catalog, ProcessStep, Record } from '../../../model/dcatApPlu.model.js';
import { ConfigService } from '../../../services/config/ConfigService.js';
import type { Contact, Organization, Person } from '../../../model/agent.js';
import type { DateRange } from '../../../model/dateRange.js';
import type { DiplanungIndexDocument } from './index.document.js';
import type { Distribution } from '../../../model/distribution.js';
import esc from "xml-escape";

function optional(wrapper: string | Function, variable: any | any[], ...remainder: any) {
    if (variable == null) {
        return '';
    }
    if (!Array.isArray(variable)) {
        variable = [variable];
    }
    if (typeof wrapper == 'string') {
        return variable.map(v => `<${wrapper}>${v}</${wrapper}>`).join('\n');
    }
    else {
        return variable.map(v => wrapper(v, remainder)).join('\n');
    }
}

function resource(wrapper: string, variable: any, prefix: string = '') {
    if (!variable) {
        return '';
    }
    return `<${wrapper} rdf:resource="${prefix}${variable}"/>`;
}

function dateAsIsoString(date: Date | string) {
    if (!(date instanceof Date)) {
        date = MiscUtils.normalizeDateTime(date);
    }
    return date?.toISOString();
}

const diplanUriPrefix = 'https://specs.diplanung.de/resource';


export class DcatApPluDocumentFactory {// no can do with TS: extends ExportDocument {

    static getExportFormat() {
        return 'dcat_ap_plu';
    }

    static async createCatalog(catalog: Catalog): Promise<string> {
        let xmlString = `<dcat:Catalog>
                <dct:identifier>${esc(catalog.identifier)}</dct:identifier>
                <dct:description>${esc(catalog.description)}</dct:description>
                <dct:title>${esc(catalog.title)}</dct:title>
                ${DcatApPluDocumentFactory.xmlFoafAgent('dct:publisher', catalog.publisher)}
                ${optional('dcat:themeTaxonomy', esc(catalog.themeTaxonomy))}
                ${optional('dct:language', esc(catalog.language))}
                ${optional('foaf:homepage', esc(catalog.homepage))}
                ${optional('dct:issued', dateAsIsoString(catalog.issued))}
                ${optional('dct:modified', dateAsIsoString(catalog.modified))}
            </dcat:Catalog>`;
        return xmlString.replace(/^\s*\n/gm, '');
    }

    static create(document: DiplanungIndexDocument): string {
        let portalUrl = ConfigService.getGeneralSettings().portalUrl;
        let xmlString = `<dcat:Dataset rdf:about="${portalUrl}/planwerke/${document.identifier}">
                ${DcatApPluDocumentFactory.xmlContact(document.contact_point, document.catalog.publisher['name'])}
                <dct:description>${esc(document.description)}</dct:description>
                <dct:identifier>${esc(document.identifier)}</dct:identifier>
                <dct:title>${esc(document.title)}</dct:title>
                <plu:planState rdf:resource="${diplanUriPrefix}/planState#${document.plan_state}"/>
                <plu:procedureState rdf:resource="${diplanUriPrefix}/procedureState#${document.procedure_state}"/>
                <dct:spatial>
                    <dct:Location>
                        ${DcatApPluDocumentFactory.xmlSpatial('dcat:bbox', document.bounding_box)}
                        ${DcatApPluDocumentFactory.xmlSpatial('locn:geometry', document.spatial)}
                        ${DcatApPluDocumentFactory.xmlSpatial('dcat:centroid', document.centroid)}
                        ${optional('locn:geographicName', esc(document.spatial_text))}
                    </dct:Location>
                </dct:spatial>
                ${DcatApPluDocumentFactory.xmlFoafAgent('dct:publisher', document.publisher)}
                ${optional((m: Person | Organization) => DcatApPluDocumentFactory.xmlFoafAgent('dcatde:maintainer', m), document.maintainers)}
                ${optional((c: Person | Organization) => DcatApPluDocumentFactory.xmlFoafAgent('dct:contributor', c), document.contributors)}
                ${optional(DcatApPluDocumentFactory.xmlDistribution, document.distributions)}
                ${optional(DcatApPluDocumentFactory.xmlAdmsIdentifier, esc(document.adms_identifier))}
                ${optional('dct:issued', dateAsIsoString(document.issued))}
                ${optional('dct:modified', dateAsIsoString(document.modified))}
                ${resource('dct:relation', document.relation)}
                ${optional(DcatApPluDocumentFactory.xmlPeriodOfTime, document.development_freeze_period, 'plu:developmentFreezePeriod')}
                ${optional(DcatApPluDocumentFactory.xmlPeriodOfTime, document.procedure_period, 'plu:procedurePeriod')}
                ${optional('plu:planName', esc(document.plan_name))}
                ${resource('plu:planType', document.plan_type, `${diplanUriPrefix}/planType#`)}
                ${resource('plu:planTypeFine', document.plan_type_fine)}
                ${resource('plu:procedureType', document.procedure_type, `${diplanUriPrefix}/procedureType#`)}
                ${optional(DcatApPluDocumentFactory.xmlProcessStep, document.process_steps)}
                ${optional('plu:notification', esc(document.notification))}
            </dcat:Dataset>`;
        return xmlString.replace(/^\s*\n/gm, '');
    }

    private static xmlSpatial(tagname: string, json: object): string {
        if (!json) {
            return '';
        }
        return `<${tagname} rdf:datatype="https://www.iana.org/assignments/media-types/application/vnd.geo+json">
            ${JSON.stringify(json)}
        </${tagname}>`;
    }

    private static xmlDistribution(distribution: Distribution): string {
        return `<dcat:distribution>
            <dcat:Distribution>
                <dcat:accessURL rdf:resource="${esc(distribution.accessURL)}"/>
                ${optional('dct:description', esc(distribution.description))}
                ${resource('dcat:downloadURL', esc(distribution.downloadURL))}
                ${optional('dct:format', esc(distribution.format?.[0]))}
                ${optional('dct:issued', dateAsIsoString(distribution.issued))}
                ${optional('dct:modified', dateAsIsoString(distribution.modified))}
                ${optional(DcatApPluDocumentFactory.xmlPeriodOfTime, distribution.temporal, 'dct:temporal')}
                ${resource('plu:docType', esc(distribution.pluDocType), `${diplanUriPrefix}/docType#`)}
                ${optional('plu:mapLayerNames', esc(distribution.mapLayerNames?.join(',')))}
                ${optional('dct:title', esc(distribution.title))}
            </dcat:Distribution>
        </dcat:distribution>`;
    }

    private static xmlFoafAgent(parent: string, agent: Person | Organization): string {
        let name = (<Organization>agent)?.organization ?? (<Person>agent)?.name;
        return `<${parent}>
            <foaf:Agent>
                <foaf:name>${esc(name)}</foaf:name>
                ${resource('dct:type', esc(agent?.type))}
            </foaf:Agent>
        </${parent}>`;
    }

    private static xmlPeriodOfTime({ gte: start, lte: end }: DateRange, relation: string): string {
        return `<${relation}>
            <dct:PeriodOfTime>
                ${optional('dcat:startDate', dateAsIsoString(start))}
                ${optional('dcat:endDate', dateAsIsoString(end))}
            </dct:PeriodOfTime>
        </${relation}>`;
    }

    private static xmlProcessStep({ distributions, identifier, passNumber, temporal, title, type }: ProcessStep): string {
        return `<plu:processStep>
            <plu:ProcessStep>
                <plu:processStepType rdf:resource="${diplanUriPrefix}/processStepType#${type}"/>
                ${optional('dct:identifier', esc(identifier))}
                ${optional('dct:title', esc(title))}
                ${optional(DcatApPluDocumentFactory.xmlDistribution, distributions)}
                ${optional(DcatApPluDocumentFactory.xmlPeriodOfTime, temporal, 'dct:temporal')}
                ${optional('plu:passNumber', passNumber)}
            </plu:ProcessStep>
        </plu:processStep>`;
    }

    private static xmlRecord({ issued, modified, primaryTopic, title }: Record) {
        return `<dcat:record>
            <dcat:CatalogRecord>
                <dct:title>${esc(title)}</dct:title>
                <foaf:primaryTopic>${esc(primaryTopic)}</foaf:primaryTopic>
                ${optional('dct:issued', dateAsIsoString(issued))}
                ${optional('dct:modified', dateAsIsoString(modified))}
            </dcat:CatalogRecord>
        </dcat:record>`;
    }

    private static xmlContact(contact: Contact, backupFn: string): string {
        if (!contact) {
            contact = { fn: '' };
        }
        // if fn is not set, use orgName instead
        return `<dcat:contactPoint>
            <vcard:Organization>
                <vcard:fn>${contact?.fn ? esc(contact.fn) : esc(contact.hasOrganizationName) ?? esc(backupFn)}</vcard:fn>
                ${optional('vcard:hasOrganizationName', esc(contact.hasOrganizationName))}
                ${optional('vcard:hasPostalCode', esc(contact.hasPostalCode))}
                ${optional('vcard:hasStreetAddress', esc(contact.hasStreetAddress))}
                ${optional('vcard:hasLocality', esc(contact.hasLocality))}
                ${optional('vcard:hasRegion', esc(contact.hasRegion))}
                ${optional('vcard:hasCountryName', esc(contact.hasCountryName))}
                ${optional('vcard:hasEmail', esc(contact.hasEmail))}
                ${optional('vcard:hasTelephone', esc(contact.hasTelephone))}
                ${optional('vcard:hasUID', esc(contact.hasUID))}
                ${optional('vcard:hasURL', esc(contact.hasURL))}
            </vcard:Organization>
        </dcat:contactPoint>`;
    }

    private static xmlAdmsIdentifier(admsIdentifier: string) {
        return`<adms:identifier rdf:resource="${diplanUriPrefix}/authority#${esc(admsIdentifier)}"/>`;
    }
}
