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

import type { Quad, Quad_Subject, Term } from '@rdfjs/types';
import type { License } from '@shared/license.model.js';
import { DOMImplementation, XMLSerializer } from '@xmldom/xmldom';
import type { Geometry } from 'geojson';
import log4js from 'log4js';
import { DataFactory, type Store } from 'n3';
import { throwError } from 'rxjs';
import type { Contact, Person } from '../../model/agent.js';
import type { DateRange } from '../../model/dateRange.js';
import type { Distribution } from '../../model/distribution.js';
import type { IndexDocument, MetadataSource } from '../../model/index.document.js';
import type { Summary } from '../../model/summary.js';
import { DcatLicensesUtils } from '../../utils/dcat.licenses.utils.js';
import { DcatPeriodicityUtils } from '../../utils/dcat.periodicity.utils.js';
import { fromWkt } from '../../utils/geojson.utils.js';
import type { RequestOptions } from '../../utils/http-request.utils.js';
import { RequestDelegate } from '../../utils/http-request.utils.js';
import { UrlUtils } from '../../utils/url.utils.js';
import {DCAT_LANGUAGE_URL, prettyPrintXml} from '../dcatapde/dcatapde.utils.js';
import { Mapper } from '../mapper.js';
import { namespaces } from '../namespaces.js';
import type { ToDcatapdeMapper } from '../to.dcatapde.mapper.js';
import type { ToElasticMapper } from '../to.elastic.mapper.js';
import type { DcatapSettings } from './dcatap.settings.js';

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

type IsoReference = { title: string, href?: string };

export type DcatapContact = Contact & {
    'organization-name'?: string,
    isOrganization?: boolean,   // rdf:type vcard:Organization
    role?: string               // vcard:role
};

export class DcatapMapper extends Mapper<DcatapSettings> implements ToElasticMapper<IndexDocument>, ToDcatapdeMapper {

    private readonly datasetSubject: Quad_Subject;
    private readonly store: Store;
    private readonly rawPayload: string;
    private harvestTime: Date;
    private readonly uuid: string;

    private fetched: any = {
        contactPoints: null,
        description: undefined,  // null = fetched, but not present
        publishers: null,
        keywords: null,
        themes: null
    };

    log = log4js.getLogger(import.meta.filename);

    constructor(
        settings: DcatapSettings,
        datasetSubject: Quad_Subject,
        store: Store,
        rawPayload: string,
        harvestTime: Date,
        summary: Summary
    ) {
        super(settings, summary);
        this.datasetSubject = datasetSubject;
        this.store = store;
        this.rawPayload = rawPayload;
        this.harvestTime = harvestTime;

        const idTerms = this.getObjects(this.datasetSubject, namespaces.DCT + 'identifier');
        let uuid = idTerms.length > 0 ? idTerms[0].value : undefined;
        if (!uuid) {
            uuid = this.datasetSubject.value;
        }
        if (settings.idRegex) {
            const matches = new RegExp(settings.idRegex).exec(uuid)?.filter(Boolean);
            if (!matches || matches.length < 2) {
                throw new Error(`Could not extract UUID from ${uuid} using ${settings.idRegex}`);
            }
            matches.shift();
            uuid = matches.join('_');
        }
        this.uuid = uuid;

        super.init();
    }

    private getObjects(subject: Quad_Subject | string, predicateUri: string): Term[] {
        const subjNode = typeof subject === 'string'
            ? (subject.startsWith('_:') ? DataFactory.blankNode(subject.slice(2)) : DataFactory.namedNode(subject))
            : subject;
        const rawQuads = (this.store as any).rawQuads as Quad[] | undefined;
        if (rawQuads && rawQuads.length > 0) {
            return rawQuads
                .filter(q => q.subject.value === subjNode.value && q.predicate.value === predicateUri)
                .map(q => q.object);
        }
        return this.store.getObjects(subjNode, DataFactory.namedNode(predicateUri), null);
    }

    private getFirstObject(subject: Quad_Subject | string, predicateUri: string): Term | undefined {
        const objs = this.getObjects(subject, predicateUri);
        return objs.length > 0 ? objs[0] : undefined;
    }

    private getFirstLiteral(subject: Quad_Subject | string, predicateUri: string): string | undefined {
        const obj = this.getFirstObject(subject, predicateUri);
        return obj ? obj.value : undefined;
    }

    async createIndexDocument(): Promise<IndexDocument> {
        return {
            uuid: this.getGeneratedId(),
            extras: {
                metadata: this.getHarvestingMetadata(),
            }
        };
    }

    async createDcatapdeDocument(): Promise<string> {
        return this.getHarvestedData();
    }

    /**
     * Create an ISO 19139 (gmd:MD_Metadata) document from the DCAT-AP dataset,
     * following the GeoDCAT-AP mapping in reverse.
     * Mandatory ISO elements without source data are written with a gco:nilReason.
     */
    createCswIsoDocument(): string {
        const doc = new DOMImplementation().createDocument(namespaces.GMD, 'gmd:MD_Metadata', null);
        const root = doc.documentElement;
        root.setAttributeNS(namespaces.XMLNS, 'xmlns:gco', namespaces.GCO);
        root.setAttributeNS(namespaces.XMLNS, 'xmlns:gmx', namespaces.GMX);
        root.setAttributeNS(namespaces.XMLNS, 'xmlns:gml', namespaces.GML_3_2);
        root.setAttributeNS(namespaces.XMLNS, 'xmlns:xlink', namespaces.XLINK);

        const language = this.getIsoLanguage();
        const contacts = this.getIsoParties();

        this.isoCharacterString(root, 'fileIdentifier', this.getGeneratedId());
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
        this.isoCharacterString(dataIdentification, 'abstract', this.getDescription());
        this.buildIsoContacts(dataIdentification, 'pointOfContact', contacts);
        this.buildIsoKeywords(dataIdentification);
        this.buildIsoConstraints(dataIdentification);
        this.buildIsoLanguage(dataIdentification, language);
        this.isoCodeListValue(dataIdentification, 'characterSet', 'MD_CharacterSetCode', 'utf8');
        this.buildIsoExtent(dataIdentification);

        this.buildIsoDistributionInfo(root);
        this.buildIsoDataQuality(root);

        const iso = new XMLSerializer().serializeToString(doc);
        return prettyPrintXml(iso)
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
     * Write `<gmd:name><gmx:Anchor xlink:href="href">title</gmx:Anchor></gmd:name>`,
     * falling back to a gco:CharacterString if there is no href.
     */
    private isoAnchor(parent: Element, name: string, reference: IsoReference): void {
        if (!reference.href) {
            this.isoCharacterString(parent, name, reference.title);
            return;
        }
        const anchor = this.isoElement(this.isoElement(parent, namespaces.GMD, `gmd:${name}`), namespaces.GMX, 'gmx:Anchor', reference.title);
        anchor.setAttributeNS(namespaces.XLINK, 'xlink:href', reference.href);
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
        this.isoCharacterString(citation, 'title', this.getTitle());
        const issued = this.toIsoDate(this.getFirstLiteral(this.datasetSubject, namespaces.DCT + 'issued'));
        const modified = this.toIsoDate(this.getModifiedDate());
        if (issued) {
            this.isoDate(citation, issued, 'publication');
        }
        if (modified) {
            this.isoDate(citation, modified, 'revision');
        }
        if (!issued && !modified) {
            this.isoNil(citation, 'date');
        }
        for (const identifier of this.getObjects(this.datasetSubject, namespaces.DCT + 'identifier')) {
            const mdIdentifier = this.isoElement(this.isoElement(citation, namespaces.GMD, 'gmd:identifier'), namespaces.GMD, 'gmd:MD_Identifier');
            this.isoCharacterString(mdIdentifier, 'code', identifier.value);
        }
    }

    private buildIsoKeywords(dataIdentification: Element): void {
        const keywords = this.getKeywords();
        if (keywords.length) {
            const mdKeywords = this.isoElement(this.isoElement(dataIdentification, namespaces.GMD, 'gmd:descriptiveKeywords'), namespaces.GMD, 'gmd:MD_Keywords');
            keywords.forEach(keyword => this.isoCharacterString(mdKeywords, 'keyword', keyword));
        }

        // theme IRIs become anchors, labels and literals plain keywords
        const themes: IsoReference[] = this.getThemes().map(theme => /^https?:\/\//.test(theme)
            ? { title: this.getFirstLiteral(theme, namespaces.SKOS + 'prefLabel') ?? this.getLastPathSegment(theme), href: theme }
            : { title: theme });
        const inspireThemes = themes.filter(theme => theme.href?.startsWith(INSPIRE_THEME_URL));
        const otherThemes = themes.filter(theme => !theme.href?.startsWith(INSPIRE_THEME_URL));
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

    private buildIsoThemeKeywords(dataIdentification: Element, themes: IsoReference[]): Element {
        const mdKeywords = this.isoElement(this.isoElement(dataIdentification, namespaces.GMD, 'gmd:descriptiveKeywords'), namespaces.GMD, 'gmd:MD_Keywords');
        themes.forEach(theme => this.isoAnchor(mdKeywords, 'keyword', theme));
        this.isoCodeListValue(mdKeywords, 'type', 'MD_KeywordTypeCode', 'theme');
        return mdKeywords;
    }

    private buildIsoConstraints(dataIdentification: Element): void {
        const distributions = this.getObjects(this.datasetSubject, namespaces.DCAT + 'distribution') as Quad_Subject[];

        const rights = new Set<string>();
        for (const distribution of distributions) {
            this.getObjects(distribution, namespaces.DCT + 'rights')
                .map(term => this.getTermLabel(term))
                .filter(Boolean)
                .forEach(label => rights.add(label));
        }
        for (const right of rights) {
            const constraints = this.isoElement(this.isoElement(dataIdentification, namespaces.GMD, 'gmd:resourceConstraints'), namespaces.GMD, 'gmd:MD_Constraints');
            this.isoCharacterString(constraints, 'useLimitation', right);
        }

        const licenses = new Map<string, IsoReference>();
        for (const subject of [this.datasetSubject, ...distributions]) {
            for (const term of this.getObjects(subject, namespaces.DCT + 'license')) {
                // JSON-LD `"@id": ""` resolves to the document URL - this is not a license
                if (term.termType != 'NamedNode' || term.value == this.settings.sourceURL || licenses.has(term.value)) {
                    continue;
                }
                const title = DcatLicensesUtils.get(term.value)?.title ?? this.getTermLabel(term);
                licenses.set(term.value, { title, href: term.value });
            }
        }
        for (const license of licenses.values()) {
            const constraints = this.isoElement(this.isoElement(dataIdentification, namespaces.GMD, 'gmd:resourceConstraints'), namespaces.GMD, 'gmd:MD_LegalConstraints');
            this.isoCodeListValue(constraints, 'useConstraints', 'MD_RestrictionCode', 'otherRestrictions');
            this.isoAnchor(constraints, 'otherConstraints', license);
        }

        for (const term of this.getObjects(this.datasetSubject, namespaces.DCT + 'accessRights')) {
            const title = this.getTermLabel(term);
            if (!title) {
                continue;
            }
            const constraints = this.isoElement(this.isoElement(dataIdentification, namespaces.GMD, 'gmd:resourceConstraints'), namespaces.GMD, 'gmd:MD_LegalConstraints');
            this.isoCodeListValue(constraints, 'accessConstraints', 'MD_RestrictionCode', 'otherRestrictions');
            this.isoAnchor(constraints, 'otherConstraints', { title, href: term.termType == 'NamedNode' ? term.value : undefined });
        }
    }

    private buildIsoExtent(dataIdentification: Element): void {
        const bbox = this.getBoundingBox(this.getSpatial());
        const temporal = this.getTemporal() ?? [];
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

        for (const distribution of this.getObjects(this.datasetSubject, namespaces.DCAT + 'distribution') as Quad_Subject[]) {
            const format = this.getIsoFormat(distribution);
            if (format) {
                formats.add(format);
            }
            const name = this.getFirstLiteral(distribution, namespaces.DCT + 'title');
            const description = this.getFirstLiteral(distribution, namespaces.DCT + 'description');
            this.getObjects(distribution, namespaces.DCAT + 'downloadURL').forEach(url => addLink({ url: url.value, name, description, function: 'download' }));
            this.getObjects(distribution, namespaces.DCAT + 'accessURL').forEach(url => addLink({ url: url.value, name, description }));
            this.getObjects(distribution, namespaces.DCAT + 'endpointURL').forEach(url => addLink({ url: url.value, name, description }));
        }
        const landingPage = this.getLandingPage() ?? this.getFirstLiteral(this.datasetSubject, namespaces.DCT + 'landingPage');
        if (landingPage) {
            addLink({ url: landingPage, function: 'information' });
        }
        for (const page of this.getObjects(this.datasetSubject, namespaces.FOAF + 'page')) {
            const url = page.termType == 'NamedNode' ? page.value : this.getFirstLiteral(page as Quad_Subject, namespaces.FOAF + 'Document');
            addLink({ url, name: page.termType == 'BlankNode' ? this.getFirstLiteral(page as Quad_Subject, namespaces.DCT + 'title') : undefined, function: 'information' });
        }

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
        const specifications: IsoReference[] = [
            ...this.getObjects(this.datasetSubject, namespaces.DCATAP + 'applicableLegislation'),
            ...this.getObjects(this.datasetSubject, namespaces.DCT + 'conformsTo')
        ].map(term => ({
            title: this.getTermLabel(term),
            href: term.termType == 'NamedNode' ? term.value : undefined
        })).filter(spec => spec.title);
        const lineage = this.getObjects(this.datasetSubject, namespaces.DCT + 'provenance')
            .map(term => this.getTermLabel(term, false))
            .find(Boolean);
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
        for (const contact of this.getContactPoints()) {
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
            for (const term of this.getObjects(this.datasetSubject, predicate)) {
                const subject = term as Quad_Subject;
                const name = this.getFirstLiteral(subject, namespaces.FOAF + 'name')
                    ?? this.getFirstLiteral(subject, namespaces.VCARD + 'fn')
                    ?? this.getFirstLiteral(subject, namespaces.RDFS + 'label');
                if (!name) {
                    continue;
                }
                parties.push({
                    organisationName: name,
                    email: (this.getFirstObject(subject, namespaces.FOAF + 'mbox') ?? this.getFirstObject(subject, namespaces.VCARD + 'hasEmail'))?.value.replace(/^mailto:/, ''),
                    url: this.getFirstObject(subject, namespaces.FOAF + 'homepage')?.value,
                    role
                });
            }
        }
        return parties;
    }

    /**
     * @returns the ISO 639-2/B code of the first dct:language of the dataset
     */
    private getIsoLanguage(): string | undefined {
        for (const term of this.getObjects(this.datasetSubject, namespaces.DCT + 'language')) {
            const code = this.getLastPathSegment(term.value).toLowerCase();
            const language = ISO_LANGUAGE_MAP[code] ?? code;
            if (/^[a-z]{3}$/.test(language)) {
                return language;
            }
        }
        return undefined;
    }

    private getIsoDateStamp(): string {
        const modified = this.toIsoDateTime(this.getModifiedDate());
        if (modified) {
            return modified;
        }
        // not using getIssued(), as it returns dct:modified
        const issued = this.getFirstLiteral(this.datasetSubject, namespaces.DCT + 'issued');
        if (issued && !isNaN(Date.parse(issued))) {
            return issued.includes('T') ? issued : `${issued}T00:00:00`;
        }
        return this.getHarvestingDate().toISOString();
    }

    private getIsoFormat(distribution: Quad_Subject): string | undefined {
        const format = this.getFirstObject(distribution, namespaces.DCT + 'format') ?? this.getFirstObject(distribution, namespaces.DCAT + 'mediaType');
        if (!format) {
            return undefined;
        }
        if (format.termType == 'Literal') {
            return format.value.trim();
        }
        return this.getFirstLiteral(format as Quad_Subject, namespaces.RDFS + 'label')
            ?? this.getFirstLiteral(format as Quad_Subject, namespaces.RDF + 'value')
            ?? (format.termType == 'NamedNode' ? this.getLastPathSegment(format.value) : undefined);
    }

    /**
     * @returns the literal value, the label of a node, or (if `useIri`) the IRI of a named node without label
     */
    private getTermLabel(term: Term, useIri = true): string | undefined {
        if (term.termType == 'Literal') {
            return term.value.trim() || undefined;
        }
        const label = this.getFirstLiteral(term as Quad_Subject, namespaces.RDFS + 'label')
            ?? this.getFirstLiteral(term as Quad_Subject, namespaces.SKOS + 'prefLabel')
            ?? this.getFirstLiteral(term as Quad_Subject, namespaces.DCT + 'title');
        return label ?? (useIri && term.termType == 'NamedNode' ? term.value : undefined);
    }

    private getLastPathSegment(iri: string): string {
        const segment = iri.replace(/[/#]+$/, '');
        return decodeURIComponent(segment.substring(Math.max(segment.lastIndexOf('/'), segment.lastIndexOf('#')) + 1));
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

    getDescription(): string | undefined {
        if (this.fetched.description !== undefined) {
            return this.fetched.description ?? undefined;
        }
        let description = this.getFirstLiteral(this.datasetSubject, namespaces.DCT + 'description');
        if (!description) {
            description = this.getFirstLiteral(this.datasetSubject, namespaces.DCT + 'abstract');
        }
        if (!description) {
            const msg = `Dataset doesn't have an description. It will not be displayed in the portal. Id: '${this.uuid}', title: '${this.getTitle()}', source: '${this.settings.sourceURL}'`;
            this.log.warn(msg);
            this.summary.warnings.push(['No description', msg]);
            this.valid = false;
            this.fetched.description = null;
            return undefined;
        }
        this.fetched.description = description;
        return description;
    }

    getLandingPage(): string | undefined {
        const landingPage = this.getFirstLiteral(this.datasetSubject, namespaces.DCAT + 'landingPage');
        return landingPage && landingPage.trim() !== '' ? landingPage : undefined;
    }

    getPoliticalGeocodingLevelURI(): string | undefined {
        const politicalGeocodingLevelURI = this.getFirstLiteral(this.datasetSubject, namespaces.DCATDE + 'politicalGeocodingLevelURI');
        return politicalGeocodingLevelURI && politicalGeocodingLevelURI.trim() !== '' ? politicalGeocodingLevelURI : undefined;
    }

    getLegalBasis(): string | undefined {
        const legalBasis = this.getFirstLiteral(this.datasetSubject, namespaces.DCATDE + 'legalBasis');
        return legalBasis?.trim() ? legalBasis : undefined;
    }

    async getDistributions(): Promise<Distribution[]> {
        const dists: Distribution[] = [];
        const distributionTerms = this.getObjects(this.datasetSubject, namespaces.DCAT + 'distribution');

        for (const distTerm of distributionTerms) {
            const distSubject = distTerm as Quad_Subject;

            let format = 'Unbekannt';
            const formatObj = this.getFirstObject(distSubject, namespaces.DCT + 'format');
            const mediaTypeObj = this.getFirstObject(distSubject, namespaces.DCAT + 'mediaType');

            if (formatObj) {
                if (formatObj.termType === 'NamedNode' || formatObj.termType === 'BlankNode') {
                    const labelObj = this.getFirstLiteral(formatObj as Quad_Subject, namespaces.RDFS + 'label');
                    const valueObj = this.getFirstLiteral(formatObj as Quad_Subject, namespaces.RDF + 'value');
                    if (labelObj) {
                        format = labelObj;
                    }
                    else if (valueObj) {
                        format = valueObj;
                    }
                    else {
                        format = formatObj.value;
                    }
                }
                else {
                    format = formatObj.value.trim();
                }
                if (format.startsWith('http://publications.europa.eu/resource/authority/file-type/')) {
                    format = format.substring('http://publications.europa.eu/resource/authority/file-type/'.length);
                }
            }
            else if (mediaTypeObj) {
                format = mediaTypeObj.value;
                if (format.startsWith('https://www.iana.org/assignments/media-types/')) {
                    format = format.substring('https://www.iana.org/assignments/media-types/'.length);
                }
            }

            let license: any = undefined;
            const licenseObj = this.getFirstObject(distSubject, namespaces.DCT + 'license');
            if (licenseObj) {
                const licenseInfo = DcatLicensesUtils.get(licenseObj.value);
                if (licenseInfo) {
                    license = {
                        name: licenseInfo.title,
                        url: licenseInfo.url
                    };
                }
                const licenseAttributionByText = this.getFirstLiteral(distSubject, namespaces.DCATDE + 'licenseAttributionByText');
                if (licenseAttributionByText) {
                    license['attribution_by_text'] = licenseAttributionByText;
                }
            }

            const urlObj = this.getFirstObject(distSubject, namespaces.DCAT + 'accessURL');
            const title = this.getFirstLiteral(distSubject, namespaces.DCT + 'title');
            const description = this.getFirstLiteral(distSubject, namespaces.DCT + 'description');
            const issuedStr = this.getFirstLiteral(distSubject, namespaces.DCT + 'issued');
            const modifiedStr = this.getFirstLiteral(distSubject, namespaces.DCT + 'modified');
            const sizeStr = this.getFirstLiteral(distSubject, namespaces.DCAT + 'byteSize');

            const languages: string[] = [];
            const languageNodes = this.getObjects(distSubject, namespaces.DCAT + 'language');
            for (const langNode of languageNodes) {
                let language = langNode.value;
                if (language && language.startsWith(DCAT_LANGUAGE_URL)) {
                    language = language.substring(DCAT_LANGUAGE_URL.length);
                }
                if (language && language.trim().length > 0 && !languages.includes(language.trim())) {
                    languages.push(language.trim());
                }
            }

            if (urlObj) {
                const dist: Distribution = {
                    format: UrlUtils.mapFormat([format], this.summary.warnings).filter(x => x !== 'Unbekannt'),
                    access_url: urlObj.value,
                    title: title ? title : undefined,
                    description: description ? description : undefined,
                    issued: issuedStr ? new Date(issuedStr) : undefined,
                    modified: modifiedStr ? new Date(modifiedStr) : undefined,
                    byteSize: sizeStr ? Number(sizeStr) : undefined,
                    license
                };
                dists.push(dist);
            }
        }

        return dists;
    }

    private extractAgents(predicateUri: string): Person[] {
        const agents: Person[] = [];
        const agentTerms = this.getObjects(this.datasetSubject, predicateUri);

        for (const agentTerm of agentTerms) {
            const agentSubject = agentTerm as Quad_Subject;
            const typeTerms = this.getObjects(agentSubject, namespaces.RDF + 'type');
            const isOrganization = typeTerms.some(t => t.value === namespaces.FOAF + 'Organization');
            if (!isOrganization) {
                continue;
            }

            const name = this.getFirstLiteral(agentSubject, namespaces.FOAF + 'name')
                || this.getFirstLiteral(agentSubject, namespaces.VCARD + 'fn')
                || this.getFirstLiteral(agentSubject, namespaces.RDFS + 'label');
            const mboxObj = this.getFirstObject(agentSubject, namespaces.FOAF + 'mbox')
                || this.getFirstObject(agentSubject, namespaces.VCARD + 'hasEmail');

            if (name) {
                const info: Person = { name };
                if (mboxObj) {
                    info.mbox = mboxObj.value.replace(/^mailto:/, '');
                }
                agents.push(info);
            }
        }
        return agents;
    }

    getPublisher(): Person[] {
        if (this.fetched.publishers != null) {
            return this.fetched.publishers;
        }
        const publishers = this.extractAgents(namespaces.DCT + 'publisher');
        if (publishers.length === 0) {
            this.summary.missingPublishers++;
        }
        this.fetched.publishers = publishers;
        return publishers;
    }

    getCreator(): Person[] {
        return this.extractAgents(namespaces.DCT + 'creator');
    }

    getMaintainer(): Person[] {
        return this.extractAgents(namespaces.DCT + 'maintainer');
    }

    getOriginator(): Person[] {
        return this.extractAgents(namespaces.DCATDE + 'originator');
    }

    getTitle(): string | undefined {
        const title = this.getFirstLiteral(this.datasetSubject, namespaces.DCT + 'title');
        return title && title.trim() !== '' ? title : undefined;
    }

    getAccessRights(): string[] {
        return undefined;
    }

    getCitation(): string {
        return undefined;
    }

    getGeneratedId(): string {
        return this.uuid;
    }

    getKeywords(): string[] {
        if (this.fetched.keywords != null) {
            return this.fetched.keywords;
        }

        const keywordTerms = this.getObjects(this.datasetSubject, namespaces.DCAT + 'keyword');
        const keywords: string[] = [];
        for (const term of keywordTerms) {
            if (term.value) {
                const parts = term.value.split(',').map(k => k.trim()).filter(k => k.length > 0);
                keywords.push(...parts);
            }
        }

        if (this.settings.filterTags && this.settings.filterTags.length > 0 && !keywords.some(keyword => this.settings.filterTags.includes(keyword))) {
            this.skipped = true;
        }

        this.fetched.keywords = keywords;
        return keywords;
    }

    getMetadataSource(): MetadataSource {
        const portalLink = this.datasetSubject.termType === 'NamedNode' ? this.datasetSubject.value : undefined;
        return {
            source_base: this.settings.sourceURL,
            raw_data_source: undefined,
            source_type: 'dcat',
            portal_link: portalLink,
            attribution: this.settings.defaultAttribution
        };
    }

    getModifiedDate(): Date | undefined {
        const modified = this.getFirstLiteral(this.datasetSubject, namespaces.DCT + 'modified');
        return modified ? new Date(modified) : undefined;
    }

    getSpatial(): any {
        const spatialTerms = [
            ...this.getObjects(this.datasetSubject, namespaces.DCT + 'spatial'),
            ...this.getObjects(this.datasetSubject, namespaces.DCT + 'location')
        ];

        for (const spatialTerm of spatialTerms) {
            if (spatialTerm.termType === 'Literal') {
                const geom = this.parseGeoTerm(spatialTerm);
                if (geom) {
                    return geom;
                }
            }
            else {
                const spatialSubject = spatialTerm as Quad_Subject;

                const geoTerms = [
                    ...this.getObjects(spatialSubject, namespaces.LOCN + 'geometry'),
                    ...this.getObjects(spatialSubject, namespaces.OGC + 'asWKT'),
                    ...this.getObjects(spatialSubject, namespaces.GEOSPARQL + 'asWKT'),
                    ...this.getObjects(spatialSubject, namespaces.DCAT + 'bbox'),
                    ...this.getObjects(spatialSubject, namespaces.DCT + 'bbox'),
                ];

                // check GeoJSON
                for (const geoTerm of geoTerms) {
                    if (geoTerm.termType === 'Literal') {
                        const geom = this.parseGeoJsonLiteral(geoTerm);
                        if (geom) {
                            return geom;
                        }
                    }
                }

                // fallback: check WKT
                for (const geoTerm of geoTerms) {
                    if (geoTerm.termType === 'Literal') {
                        const geom = this.parseWktLiteral(geoTerm);
                        if (geom) {
                            return geom;
                        }
                    }
                }
            }
        }
        return undefined;
    }

    private parseGeoTerm(term: Term): any {
        if (term.termType !== 'Literal') {
            return undefined;
        }
        return this.parseGeoJsonLiteral(term) || this.parseWktLiteral(term);
    }

    private parseGeoJsonLiteral(term: Term): any {
        if (term.termType !== 'Literal') {
            return undefined;
        }
        if (term.datatype?.value === 'https://www.iana.org/assignments/media-types/application/vnd.geo+json' || term.value.trim().startsWith('{')) {
            try {
                return JSON.parse(term.value);
            }
            catch (ignored) {}
        }
        return undefined;
    }

    private parseWktLiteral(term: Term): any {
        if (term.termType == 'Literal') {
            return fromWkt(term.value);
        }
        return undefined;
    }

    getSpatialText(): string | undefined {
        const spatialTerms = [
            ...this.getObjects(this.datasetSubject, namespaces.DCT + 'spatial'),
            ...this.getObjects(this.datasetSubject, namespaces.DCT + 'location')
        ];
        for (const spatialTerm of spatialTerms) {
            if (spatialTerm.termType !== 'Literal') {
                const prefLabel = this.getFirstLiteral(spatialTerm as Quad_Subject, namespaces.SKOS + 'prefLabel')
                    || this.getFirstLiteral(spatialTerm as Quad_Subject, namespaces.RDFS + 'label');
                if (prefLabel) {
                    return prefLabel;
                }
            }
        }
        return undefined;
    }

    getTemporal(): DateRange[] | undefined {
        const result: DateRange[] = [];
        const temporalTerms = this.getObjects(this.datasetSubject, namespaces.DCT + 'temporal');

        for (const temporalTerm of temporalTerms) {
            const temporalSubject = temporalTerm as Quad_Subject;
            const begin = this.getTimeValue(temporalSubject, 'startDate');
            const end = this.getTimeValue(temporalSubject, 'endDate');

            if (begin || end) {
                result.push({
                    gte: begin ? begin : undefined,
                    lte: end ? end : undefined
                });
            }
        }

        if (result.length) {
            return result;
        }
        return undefined;
    }

    private getTimeValue(temporalSubject: Quad_Subject, beginOrEnd: 'startDate' | 'endDate'): Date | undefined {
        const dateStr = this.getFirstLiteral(temporalSubject, namespaces.SCHEMA + beginOrEnd)
            || this.getFirstLiteral(temporalSubject, namespaces.DCAT + beginOrEnd)
            || this.getFirstLiteral(temporalSubject, namespaces.DCT + beginOrEnd);
        if (dateStr) {
            const date = new Date(Date.parse(dateStr));
            if (!isNaN(date.getTime())) {
                return date;
            }
            else {
                this.log.warn(`Error parsing date, which was '${dateStr}'. It will be ignored.`);
            }
        }
        return undefined;
    }

    getThemes(): string[] {
        if (this.fetched.themes != null) return this.fetched.themes;

        const themeTerms = this.getObjects(this.datasetSubject, namespaces.DCAT + 'theme');
        const themes: string[] = [];
        for (const themeTerm of themeTerms) {
            if (themeTerm.termType === 'Literal' || themeTerm.termType === 'NamedNode') {
                if (themeTerm.value && themeTerm.value.trim()) {
                    const parts = themeTerm.value.split(',').map(t => t.trim()).filter(t => t.length > 0);
                    themes.push(...parts);
                }
            }
            else if (themeTerm.termType === 'BlankNode') {
                const label = this.getFirstLiteral(themeTerm as Quad_Subject, namespaces.SKOS + 'prefLabel')
                    || this.getFirstLiteral(themeTerm as Quad_Subject, namespaces.RDFS + 'label')
                    || this.getFirstLiteral(themeTerm as Quad_Subject, namespaces.DCT + 'identifier');
                if (label && label.trim()) {
                    const parts = label.split(',').map(t => t.trim()).filter(t => t.length > 0);
                    themes.push(...parts);
                }
                else {
                    const exactMatch = this.getFirstObject(themeTerm as Quad_Subject, namespaces.SKOS + 'exactMatch');
                    if (exactMatch && exactMatch.value && exactMatch.value.trim()) {
                        const parts = exactMatch.value.split(',').map(t => t.trim()).filter(t => t.length > 0);
                        themes.push(...parts);
                    }
                }
            }
        }

        if (this.settings.filterThemes && this.settings.filterThemes.length > 0 && !themes.some(theme => this.settings.filterThemes.includes(theme.substring(theme.lastIndexOf('/') + 1)))) {
            this.skipped = true;
        }

        this.fetched.themes = themes;
        return themes;
    }

    isRealtime(): boolean {
        return undefined;
    }

    getAccrualPeriodicity(): string | undefined {
        const accrualPeriodicity = this.getFirstLiteral(this.datasetSubject, namespaces.DCT + 'accrualPeriodicity');
        if (accrualPeriodicity) {
            const periodicity = accrualPeriodicity.includes('/')
                ? accrualPeriodicity.substring(accrualPeriodicity.lastIndexOf('/') + 1)
                : accrualPeriodicity;

            if (periodicity) {
                const period = DcatPeriodicityUtils.getPeriodicity(periodicity);
                if (!period) {
                    this.summary.warnings.push(['Unbekannte Periodizität', periodicity]);
                }
                return period;
            }
        }
        return undefined;
    }

    async getLicense(): Promise<License> {
        let license: License;

        const accessRightsTerms = this.getObjects(this.datasetSubject, namespaces.DCT + 'accessRights');
        for (const term of accessRightsTerms) {
            try {
                const json = JSON.parse(term.value);
                if (!json.id || !json.url) continue;

                const requestConfig = this.getUrlCheckRequestConfig(json.url);
                license = {
                    id: json.id,
                    title: json.name,
                    url: await UrlUtils.urlWithProtocolFor(requestConfig, this.settings.skipUrlCheckOnHarvest)
                };
                break;
            }
            catch (ignored) {}
        }

        if (!license) {
            const distributionTerms = this.getObjects(this.datasetSubject, namespaces.DCAT + 'distribution');
            for (const distTerm of distributionTerms) {
                const licenseObj = this.getFirstObject(distTerm as Quad_Subject, namespaces.DCT + 'license');
                if (licenseObj) {
                    license = DcatLicensesUtils.get(licenseObj.value);
                    break;
                }
            }
        }

        if (!license) {
            const msg = `No license detected for dataset. ${this.getErrorSuffix(this.uuid, this.getTitle())}`;
            this.summary.missingLicense++;

            this.log.warn(msg);
            this.summary.warnings.push(['Missing license', msg]);
            return {
                id: 'unknown',
                title: 'Unbekannt',
                url: undefined
            };
        }

        return license;
    }

    getErrorSuffix(uuid: string, title: string): string {
        return `Id: '${uuid}', title: '${title}', source: '${this.settings.sourceURL}'.`;
    }

    getHarvestedData(): string {
        return this.rawPayload;
    }

    getGroups(): string[] {
        return undefined;
    }

    getIssued(): Date | undefined {
        const modified = this.getFirstLiteral(this.datasetSubject, namespaces.DCT + 'modified');
        return modified ? new Date(modified) : undefined;
    }

    getHarvestingDate(): Date {
        return this.harvestTime || new Date();
    }

    getSubSections(): any[] {
        return undefined;
    }

    /**
     * @returns the first dcat:contactPoint, or `{ fn: null }` if there is none
     */
    getContactPoint(): DcatapContact {
        return this.getContactPoints()[0] ?? { fn: null };
    }

    /**
     * @returns all dcat:contactPoint nodes (vCard); address properties are read from
     * vcard:hasAddress, falling back to the contact node itself
     */
    getContactPoints(): DcatapContact[] {
        if (this.fetched.contactPoints) {
            return this.fetched.contactPoints;
        }

        const contacts: DcatapContact[] = [];
        for (const contactTerm of this.getObjects(this.datasetSubject, namespaces.DCAT + 'contactPoint')) {
            const contactSubject = contactTerm as Quad_Subject;
            const addressSubject = this.getFirstObject(contactSubject, namespaces.VCARD + 'hasAddress') as Quad_Subject ?? contactSubject;

            const name = this.getFirstLiteral(contactSubject, namespaces.VCARD + 'fn');
            const org = this.getFirstLiteral(contactSubject, namespaces.VCARD + 'organization-name')
                || this.getFirstLiteral(contactSubject, namespaces.VCARD + 'org');
            const street = this.getFirstLiteral(addressSubject, namespaces.VCARD + 'street-address');
            const locality = this.getFirstLiteral(addressSubject, namespaces.VCARD + 'locality');
            const region = this.getFirstLiteral(addressSubject, namespaces.VCARD + 'region');
            const country = this.getFirstLiteral(addressSubject, namespaces.VCARD + 'country-name')
                || this.getFirstLiteral(contactSubject, namespaces.VCARD + 'hasCountryName');
            const postCode = this.getFirstLiteral(addressSubject, namespaces.VCARD + 'postal-code')
                || this.getFirstLiteral(contactSubject, namespaces.VCARD + 'hasPostalCode');
            const emailObj = this.getFirstObject(contactSubject, namespaces.VCARD + 'hasEmail');
            const phoneObj = this.getFirstObject(contactSubject, namespaces.VCARD + 'hasTelephone');
            const urlObj = this.getFirstObject(contactSubject, namespaces.VCARD + 'hasURL');
            const role = this.getFirstLiteral(contactSubject, namespaces.VCARD + 'role');

            const infos: DcatapContact = { fn: null };
            if (name) infos.fn = name;
            if (org) infos['organization-name'] = org;
            if (street) infos.hasStreetAddress = street;
            if (locality) infos.hasLocality = locality;
            if (region) infos.hasRegion = region;
            if (country) infos.hasCountryName = country.trim();
            if (postCode) infos.hasPostalCode = postCode;
            if (emailObj) infos.hasEmail = emailObj.value.replace(/^mailto:/, '');
            if (phoneObj) infos.hasTelephone = phoneObj.value.replace(/^tel:/, '');
            if (urlObj) infos.hasURL = urlObj.value;
            if (role) infos.role = role;
            infos.isOrganization = this.getObjects(contactSubject, namespaces.RDF + 'type').some(type => type.value == namespaces.VCARD + 'Organization');
            contacts.push(infos);
        }

        this.fetched.contactPoints = contacts;
        return contacts;
    }

    private getUrlCheckRequestConfig(uri: string): RequestOptions {
        const config: RequestOptions = {
            method: 'HEAD',
            json: false,
            headers: RequestDelegate.defaultRequestHeaders(),
            qs: {},
            uri: uri
        };
        return config;
    }

    protected getUuid(): string {
        return this.uuid;
    }

    executeCustomCode(doc: any) {
        try {
            if (this.settings.customCode) {
                eval(this.settings.customCode);
            }
        }
        catch (error) {
            throwError('An error occurred in custom code: ' + error.message);
        }
    }
}
