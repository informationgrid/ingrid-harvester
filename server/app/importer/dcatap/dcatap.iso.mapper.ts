/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2026 wemove digital solutions GmbH
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

import { DOMImplementation, XMLSerializer } from '@xmldom/xmldom';
import type { Geometry } from 'geojson';
import { prettyPrintXml } from '../dcatapde/dcatapde.utils.js';
import { namespaces } from '../namespaces.js';
import type { DcatapMapper, DcatapReference } from './dcatap.mapper.js';
import { getLastPathSegment } from './dcatap.utils.js';

const ISO_CODELIST_URL = 'http://www.isotc211.org/2005/resources/Codelist/gmxCodelists.xml';
const ISO_LANGUAGE_CODELIST_URL = 'http://www.loc.gov/standards/iso639-2';
const INSPIRE_THEME_URL = 'http://inspire.ec.europa.eu/theme/';
const ISO_ROLE_CODES = ['resourceProvider', 'custodian', 'owner', 'user', 'distributor', 'originator', 'pointOfContact', 'principalInvestigator', 'processor', 'publisher', 'author'];
// ISO 639-1 and ISO 639-2/T codes that differ from the ISO 639-2/B codes used in ISO 19139
const ISO_LANGUAGE_MAP: Record<string, string> = { de: 'ger', deu: 'ger', en: 'eng', fr: 'fre', fra: 'fre' };

type IsoParty = {
    individualName?: string,
    organisationName?: string,
    email?: string,
    phone?: string,
    url?: string,
    street?: string,
    city?: string,
    region?: string,
    postalCode?: string,
    country?: string,
    role: string
};

type IsoLink = { url: string, name?: string, description?: string, function?: string };

/**
 * Creates an ISO 19139 (gmd:MD_Metadata) document from a DCAT-AP dataset,
 * following the GeoDCAT-AP mapping in reverse.
 * All data is read through the public getters of the given `DcatapMapper`.
 * Mandatory ISO elements without source data are written with a gco:nilReason.
 */
export class DcatapIsoMapper {

    private readonly mapper: DcatapMapper;

    constructor(mapper: DcatapMapper) {
        this.mapper = mapper;
    }

    createCswIsoDocument(): string {
        const doc = new DOMImplementation().createDocument(namespaces.GMD, 'gmd:MD_Metadata', null);
        const root = doc.documentElement;
        root.setAttributeNS(namespaces.XMLNS, 'xmlns:gco', namespaces.GCO);
        root.setAttributeNS(namespaces.XMLNS, 'xmlns:gmx', namespaces.GMX);
        root.setAttributeNS(namespaces.XMLNS, 'xmlns:gml', namespaces.GML_3_2);
        root.setAttributeNS(namespaces.XMLNS, 'xmlns:xlink', namespaces.XLINK);

        const language = this.getIsoLanguage();
        const contacts = this.getIsoParties();

        this.isoCharacterString(root, 'fileIdentifier', this.mapper.getGeneratedId());
        this.buildIsoLanguage(root, language);
        this.isoCodeListValue(root, 'characterSet', 'MD_CharacterSetCode', 'utf8');
        this.isoCodeListValue(root, 'hierarchyLevel', 'MD_ScopeCode', 'dataset');
        this.isoCharacterString(root, 'hierarchyLevelName', 'dataset');
        const metadataContacts = contacts.filter(contact => contact.role == 'pointOfContact');
        this.buildIsoContacts(root, 'contact', metadataContacts.length ? metadataContacts : contacts.slice(0, 1));
        this.isoElement(this.isoElement(root, namespaces.GMD, 'gmd:dateStamp'), namespaces.GCO, 'gco:DateTime', this.getIsoDateStamp());
        this.isoCharacterString(root, 'metadataStandardName', 'ISO 19115:2003/19139');
        this.isoCharacterString(root, 'metadataStandardVersion', '1.0');

        const dataIdentification = this.isoElement(this.isoElement(root, namespaces.GMD, 'gmd:identificationInfo'), namespaces.GMD, 'gmd:MD_DataIdentification');
        this.buildIsoCitation(dataIdentification);
        this.isoCharacterString(dataIdentification, 'abstract', this.mapper.getDescription());
        this.buildIsoContacts(dataIdentification, 'pointOfContact', contacts);
        this.buildIsoKeywords(dataIdentification);
        this.buildIsoConstraints(dataIdentification);
        this.buildIsoLanguage(dataIdentification, language);
        this.isoCodeListValue(dataIdentification, 'characterSet', 'MD_CharacterSetCode', 'utf8');
        this.buildIsoExtent(dataIdentification);

        this.buildIsoDistributionInfo(root);
        this.buildIsoDataQuality(root);

        const iso = new XMLSerializer().serializeToString(doc);
        return prettyPrintXml(iso);
    }

    private isoElement(parent: Element, namespace: string, qualifiedName: string, text?: string): Element {
        const element = parent.ownerDocument.createElementNS(namespace, qualifiedName);
        if (text != null) {
            element.textContent = text;
        }
        parent.appendChild(element);
        return element;
    }

    private isoNil(parent: Element, name: string, reason: 'missing' | 'unknown' = 'missing'): Element {
        const element = this.isoElement(parent, namespaces.GMD, `gmd:${name}`);
        element.setAttributeNS(namespaces.GCO, 'gco:nilReason', reason);
        return element;
    }

    /**
     * Write `<gmd:name><gco:CharacterString>value</gco:CharacterString></gmd:name>`,
     * or `<gmd:name gco:nilReason="missing"/>` if `nilIfEmpty` is set and there is no value.
     */
    private isoCharacterString(parent: Element, name: string, value: string | undefined, nilIfEmpty = true): void {
        if (value?.trim()) {
            this.isoElement(this.isoElement(parent, namespaces.GMD, `gmd:${name}`), namespaces.GCO, 'gco:CharacterString', value.trim());
        }
        else if (nilIfEmpty) {
            this.isoNil(parent, name);
        }
    }

    /**
     * Write `<gmd:name><gmx:Anchor xlink:href="uri">label</gmx:Anchor></gmd:name>`,
     * falling back to a gco:CharacterString if there is no uri.
     */
    private isoAnchor(parent: Element, name: string, reference: DcatapReference): void {
        if (!reference.uri) {
            this.isoCharacterString(parent, name, reference.label);
            return;
        }
        const anchor = this.isoElement(this.isoElement(parent, namespaces.GMD, `gmd:${name}`), namespaces.GMX, 'gmx:Anchor', reference.label ?? reference.uri);
        anchor.setAttributeNS(namespaces.XLINK, 'xlink:href', reference.uri);
    }

    private isoCodeListValue(parent: Element, name: string, codeListName: string, value: string): void {
        const code = this.isoElement(this.isoElement(parent, namespaces.GMD, `gmd:${name}`), namespaces.GMD, `gmd:${codeListName}`, value);
        code.setAttribute('codeList', `${ISO_CODELIST_URL}#${codeListName}`);
        code.setAttribute('codeListValue', value);
    }

    private isoDate(parent: Element, date: string | undefined, dateType: string): void {
        const ciDate = this.isoElement(this.isoElement(parent, namespaces.GMD, 'gmd:date'), namespaces.GMD, 'gmd:CI_Date');
        this.isoElement(this.isoElement(ciDate, namespaces.GMD, 'gmd:date'), namespaces.GCO, 'gco:Date', date);
        this.isoCodeListValue(ciDate, 'dateType', 'CI_DateTypeCode', dateType);
    }

    private buildIsoLanguage(parent: Element, language: string | undefined): void {
        if (!language) {
            this.isoNil(parent, 'language');
            return;
        }
        const code = this.isoElement(this.isoElement(parent, namespaces.GMD, 'gmd:language'), namespaces.GMD, 'gmd:LanguageCode', language);
        code.setAttribute('codeList', ISO_LANGUAGE_CODELIST_URL);
        code.setAttribute('codeListValue', language);
    }

    private buildIsoContacts(parent: Element, name: string, parties: IsoParty[]): void {
        if (!parties.length && name == 'contact') {
            this.isoNil(parent, name);
        }
        for (const party of parties) {
            const responsibleParty = this.isoElement(this.isoElement(parent, namespaces.GMD, `gmd:${name}`), namespaces.GMD, 'gmd:CI_ResponsibleParty');
            this.isoCharacterString(responsibleParty, 'individualName', party.individualName, false);
            this.isoCharacterString(responsibleParty, 'organisationName', party.organisationName, false);
            const hasAddress = [party.street, party.city, party.region, party.postalCode, party.country, party.email].some(Boolean);
            if (party.phone || hasAddress || party.url) {
                const contact = this.isoElement(this.isoElement(responsibleParty, namespaces.GMD, 'gmd:contactInfo'), namespaces.GMD, 'gmd:CI_Contact');
                if (party.phone) {
                    const phone = this.isoElement(this.isoElement(contact, namespaces.GMD, 'gmd:phone'), namespaces.GMD, 'gmd:CI_Telephone');
                    this.isoCharacterString(phone, 'voice', party.phone);
                }
                if (hasAddress) {
                    const address = this.isoElement(this.isoElement(contact, namespaces.GMD, 'gmd:address'), namespaces.GMD, 'gmd:CI_Address');
                    this.isoCharacterString(address, 'deliveryPoint', party.street, false);
                    this.isoCharacterString(address, 'city', party.city, false);
                    this.isoCharacterString(address, 'administrativeArea', party.region, false);
                    this.isoCharacterString(address, 'postalCode', party.postalCode, false);
                    this.isoCharacterString(address, 'country', party.country, false);
                    this.isoCharacterString(address, 'electronicMailAddress', party.email, false);
                }
                if (party.url) {
                    const onlineResource = this.isoElement(this.isoElement(contact, namespaces.GMD, 'gmd:onlineResource'), namespaces.GMD, 'gmd:CI_OnlineResource');
                    this.isoElement(this.isoElement(onlineResource, namespaces.GMD, 'gmd:linkage'), namespaces.GMD, 'gmd:URL', party.url);
                }
            }
            this.isoCodeListValue(responsibleParty, 'role', 'CI_RoleCode', party.role);
        }
    }

    private buildIsoCitation(dataIdentification: Element): void {
        const citation = this.isoElement(this.isoElement(dataIdentification, namespaces.GMD, 'gmd:citation'), namespaces.GMD, 'gmd:CI_Citation');
        this.isoCharacterString(citation, 'title', this.mapper.getTitle());
        const issued = this.toIsoDate(this.mapper.getIssuedLiteral());
        const modified = this.toIsoDate(this.mapper.getModifiedDate());
        if (issued) {
            this.isoDate(citation, issued, 'publication');
        }
        if (modified) {
            this.isoDate(citation, modified, 'revision');
        }
        if (!issued && !modified) {
            this.isoNil(citation, 'date');
        }
        for (const identifier of this.mapper.getIdentifiers()) {
            const mdIdentifier = this.isoElement(this.isoElement(citation, namespaces.GMD, 'gmd:identifier'), namespaces.GMD, 'gmd:MD_Identifier');
            this.isoCharacterString(mdIdentifier, 'code', identifier);
        }
    }

    private buildIsoKeywords(dataIdentification: Element): void {
        const keywords = this.mapper.getKeywords();
        if (keywords.length) {
            const mdKeywords = this.isoElement(this.isoElement(dataIdentification, namespaces.GMD, 'gmd:descriptiveKeywords'), namespaces.GMD, 'gmd:MD_Keywords');
            keywords.forEach(keyword => this.isoCharacterString(mdKeywords, 'keyword', keyword));
        }

        // theme IRIs become anchors, labels and literals plain keywords
        const themes: DcatapReference[] = this.mapper.getThemes().map(theme => /^https?:\/\//.test(theme)
            ? { label: this.mapper.getPrefLabel(theme) ?? getLastPathSegment(theme), uri: theme }
            : { label: theme });
        const inspireThemes = themes.filter(theme => theme.uri?.startsWith(INSPIRE_THEME_URL));
        const otherThemes = themes.filter(theme => !theme.uri?.startsWith(INSPIRE_THEME_URL));
        if (inspireThemes.length) {
            const mdKeywords = this.buildIsoThemeKeywords(dataIdentification, inspireThemes);
            const thesaurus = this.isoElement(this.isoElement(mdKeywords, namespaces.GMD, 'gmd:thesaurusName'), namespaces.GMD, 'gmd:CI_Citation');
            this.isoCharacterString(thesaurus, 'title', 'GEMET - INSPIRE themes, version 1.0');
            this.isoDate(thesaurus, '2008-06-01', 'publication');
        }
        if (otherThemes.length) {
            this.buildIsoThemeKeywords(dataIdentification, otherThemes);
        }
    }

    private buildIsoThemeKeywords(dataIdentification: Element, themes: DcatapReference[]): Element {
        const mdKeywords = this.isoElement(this.isoElement(dataIdentification, namespaces.GMD, 'gmd:descriptiveKeywords'), namespaces.GMD, 'gmd:MD_Keywords');
        themes.forEach(theme => this.isoAnchor(mdKeywords, 'keyword', theme));
        this.isoCodeListValue(mdKeywords, 'type', 'MD_KeywordTypeCode', 'theme');
        return mdKeywords;
    }

    private buildIsoConstraints(dataIdentification: Element): void {
        for (const right of this.mapper.getRights()) {
            const constraints = this.isoElement(this.isoElement(dataIdentification, namespaces.GMD, 'gmd:resourceConstraints'), namespaces.GMD, 'gmd:MD_Constraints');
            this.isoCharacterString(constraints, 'useLimitation', right);
        }
        for (const license of this.mapper.getLicenses()) {
            const constraints = this.isoElement(this.isoElement(dataIdentification, namespaces.GMD, 'gmd:resourceConstraints'), namespaces.GMD, 'gmd:MD_LegalConstraints');
            this.isoCodeListValue(constraints, 'useConstraints', 'MD_RestrictionCode', 'otherRestrictions');
            this.isoAnchor(constraints, 'otherConstraints', license);
        }
        for (const accessRights of this.mapper.getAccessRightsReferences()) {
            const constraints = this.isoElement(this.isoElement(dataIdentification, namespaces.GMD, 'gmd:resourceConstraints'), namespaces.GMD, 'gmd:MD_LegalConstraints');
            this.isoCodeListValue(constraints, 'accessConstraints', 'MD_RestrictionCode', 'otherRestrictions');
            this.isoAnchor(constraints, 'otherConstraints', accessRights);
        }
    }

    private buildIsoExtent(dataIdentification: Element): void {
        const bbox = this.getBoundingBox(this.mapper.getSpatial());
        const temporal = this.mapper.getTemporal() ?? [];
        if (!bbox && !temporal.length) {
            return;
        }
        const extent = this.isoElement(this.isoElement(dataIdentification, namespaces.GMD, 'gmd:extent'), namespaces.GMD, 'gmd:EX_Extent');
        if (bbox) {
            const boundingBox = this.isoElement(this.isoElement(extent, namespaces.GMD, 'gmd:geographicElement'), namespaces.GMD, 'gmd:EX_GeographicBoundingBox');
            const [west, south, east, north] = bbox;
            this.isoElement(this.isoElement(boundingBox, namespaces.GMD, 'gmd:westBoundLongitude'), namespaces.GCO, 'gco:Decimal', String(west));
            this.isoElement(this.isoElement(boundingBox, namespaces.GMD, 'gmd:eastBoundLongitude'), namespaces.GCO, 'gco:Decimal', String(east));
            this.isoElement(this.isoElement(boundingBox, namespaces.GMD, 'gmd:southBoundLatitude'), namespaces.GCO, 'gco:Decimal', String(south));
            this.isoElement(this.isoElement(boundingBox, namespaces.GMD, 'gmd:northBoundLatitude'), namespaces.GCO, 'gco:Decimal', String(north));
        }
        temporal.forEach((range, idx) => {
            const temporalExtent = this.isoElement(this.isoElement(extent, namespaces.GMD, 'gmd:temporalElement'), namespaces.GMD, 'gmd:EX_TemporalExtent');
            const timePeriod = this.isoElement(this.isoElement(temporalExtent, namespaces.GMD, 'gmd:extent'), namespaces.GML_3_2, 'gml:TimePeriod');
            timePeriod.setAttributeNS(namespaces.GML_3_2, 'gml:id', `timePeriod_${idx + 1}`);
            for (const [name, date] of [['gml:beginPosition', range.gte], ['gml:endPosition', range.lte]] as const) {
                const position = this.isoElement(timePeriod, namespaces.GML_3_2, name, this.toIsoDate(date));
                if (!date) {
                    position.setAttribute('indeterminatePosition', 'unknown');
                }
            }
        });
    }

    private buildIsoDistributionInfo(root: Element): void {
        const formats = new Set<string>();
        const links: IsoLink[] = [];
        const addLink = (link: IsoLink) => {
            if (link.url && !links.some(l => l.url == link.url)) {
                links.push(link);
            }
        };

        for (const distribution of this.mapper.getDistributionInfos()) {
            if (distribution.format) {
                formats.add(distribution.format);
            }
            const { title: name, description } = distribution;
            distribution.downloadURLs.forEach(url => addLink({ url, name, description, function: 'download' }));
            distribution.accessURLs.forEach(url => addLink({ url, name, description }));
            distribution.endpointURLs.forEach(url => addLink({ url, name, description }));
        }
        this.mapper.getLandingPages().forEach(url => addLink({ url, function: 'information' }));
        this.mapper.getPages().forEach(page => addLink({ url: page.uri, name: page.label, function: 'information' }));

        if (!formats.size && !links.length) {
            return;
        }
        const mdDistribution = this.isoElement(this.isoElement(root, namespaces.GMD, 'gmd:distributionInfo'), namespaces.GMD, 'gmd:MD_Distribution');
        for (const format of formats) {
            const mdFormat = this.isoElement(this.isoElement(mdDistribution, namespaces.GMD, 'gmd:distributionFormat'), namespaces.GMD, 'gmd:MD_Format');
            this.isoCharacterString(mdFormat, 'name', format);
            this.isoNil(mdFormat, 'version', 'unknown');
        }
        if (links.length) {
            const transferOptions = this.isoElement(this.isoElement(mdDistribution, namespaces.GMD, 'gmd:transferOptions'), namespaces.GMD, 'gmd:MD_DigitalTransferOptions');
            for (const link of links) {
                const onlineResource = this.isoElement(this.isoElement(transferOptions, namespaces.GMD, 'gmd:onLine'), namespaces.GMD, 'gmd:CI_OnlineResource');
                this.isoElement(this.isoElement(onlineResource, namespaces.GMD, 'gmd:linkage'), namespaces.GMD, 'gmd:URL', link.url);
                this.isoCharacterString(onlineResource, 'name', link.name, false);
                this.isoCharacterString(onlineResource, 'description', link.description, false);
                if (link.function) {
                    this.isoCodeListValue(onlineResource, 'function', 'CI_OnLineFunctionCode', link.function);
                }
            }
        }
    }

    private buildIsoDataQuality(root: Element): void {
        const specifications = [...this.mapper.getApplicableLegislation(), ...this.mapper.getConformsTo()];
        const lineage = this.mapper.getProvenance();
        if (!specifications.length && !lineage) {
            return;
        }

        const dataQuality = this.isoElement(this.isoElement(root, namespaces.GMD, 'gmd:dataQualityInfo'), namespaces.GMD, 'gmd:DQ_DataQuality');
        const scope = this.isoElement(this.isoElement(dataQuality, namespaces.GMD, 'gmd:scope'), namespaces.GMD, 'gmd:DQ_Scope');
        this.isoCodeListValue(scope, 'level', 'MD_ScopeCode', 'dataset');
        for (const specification of specifications) {
            const domainConsistency = this.isoElement(this.isoElement(dataQuality, namespaces.GMD, 'gmd:report'), namespaces.GMD, 'gmd:DQ_DomainConsistency');
            const result = this.isoElement(this.isoElement(domainConsistency, namespaces.GMD, 'gmd:result'), namespaces.GMD, 'gmd:DQ_ConformanceResult');
            const citation = this.isoElement(this.isoElement(result, namespaces.GMD, 'gmd:specification'), namespaces.GMD, 'gmd:CI_Citation');
            this.isoAnchor(citation, 'title', specification);
            this.isoNil(citation, 'date');
            this.isoNil(result, 'explanation');
            this.isoNil(result, 'pass', 'unknown');
        }
        if (lineage) {
            const liLineage = this.isoElement(this.isoElement(dataQuality, namespaces.GMD, 'gmd:lineage'), namespaces.GMD, 'gmd:LI_Lineage');
            this.isoCharacterString(liLineage, 'statement', lineage);
        }
    }

    /**
     * Contacts for ISO: dcat:contactPoint (vCard), dct:publisher, dct:creator, dct:rightsHolder (FOAF or vCard agents).
     */
    private getIsoParties(): IsoParty[] {
        const parties: IsoParty[] = [];
        for (const contact of this.mapper.getContactPoints()) {
            const party: IsoParty = {
                individualName: contact.isOrganization ? undefined : contact.fn ?? undefined,
                organisationName: contact['organization-name'] ?? (contact.isOrganization ? contact.fn ?? undefined : undefined),
                email: contact.hasEmail,
                phone: contact.hasTelephone,
                url: contact.hasURL,
                street: contact.hasStreetAddress,
                city: contact.hasLocality,
                region: contact.hasRegion,
                postalCode: contact.hasPostalCode,
                country: contact.hasCountryName,
                role: ISO_ROLE_CODES.includes(contact.role) ? contact.role : 'pointOfContact'
            };
            if (party.individualName || party.organisationName || party.email) {
                parties.push(party);
            }
        }
        for (const [predicate, role] of [[namespaces.DCT + 'publisher', 'publisher'], [namespaces.DCT + 'creator', 'originator'], [namespaces.DCT + 'rightsHolder', 'owner']]) {
            for (const agent of this.mapper.getAgents(predicate)) {
                parties.push({ organisationName: agent.name, email: agent.mbox, url: agent.homepage, role });
            }
        }
        return parties;
    }

    /**
     * @returns the ISO 639-2/B code of the first dct:language of the dataset
     */
    private getIsoLanguage(): string | undefined {
        for (const value of this.mapper.getLanguages()) {
            const code = getLastPathSegment(value).toLowerCase();
            const language = ISO_LANGUAGE_MAP[code] ?? code;
            if (/^[a-z]{3}$/.test(language)) {
                return language;
            }
        }
        return undefined;
    }

    private getIsoDateStamp(): string {
        const modified = this.toIsoDateTime(this.mapper.getModifiedDate());
        if (modified) {
            return modified;
        }
        const issued = this.mapper.getIssuedLiteral();
        if (issued && !isNaN(Date.parse(issued))) {
            return issued.includes('T') ? issued : `${issued}T00:00:00`;
        }
        return this.mapper.getHarvestingDate().toISOString();
    }

    /**
     * @returns `YYYY-MM-DD`: the date part of a string as given, of a Date in UTC;
     * undefined if the date is missing or invalid
     */
    private toIsoDate(date: string | Date | undefined): string | undefined {
        if (date instanceof Date) {
            return this.toIsoDateTime(date)?.substring(0, 10);
        }
        return date && !isNaN(Date.parse(date)) ? date.substring(0, 10) : undefined;
    }

    /**
     * @returns the date as UTC ISO string, or undefined if the date is missing or invalid
     */
    private toIsoDateTime(date: Date | undefined): string | undefined {
        return date && !isNaN(date.getTime()) ? date.toISOString() : undefined;
    }

    /**
     * @returns [west, south, east, north] of the geometry
     */
    private getBoundingBox(geometry: Geometry | undefined): number[] | undefined {
        if (!geometry) {
            return undefined;
        }
        if (geometry.bbox?.length == 4) {
            return geometry.bbox;
        }
        const collect = (coords: any): number[][] => typeof coords?.[0] == 'number' ? [coords] : (coords ?? []).flatMap(collect);
        const positions = geometry.type == 'GeometryCollection'
            ? geometry.geometries.flatMap(g => collect((g as any).coordinates))
            : collect(geometry.coordinates);
        if (!positions.length) {
            return undefined;
        }
        const xs = positions.map(p => p[0]);
        const ys = positions.map(p => p[1]);
        return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    }
}
