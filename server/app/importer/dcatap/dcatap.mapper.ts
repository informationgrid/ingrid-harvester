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
import { DCAT_LANGUAGE_URL } from '../dcatapde/dcatapde.utils.js';
import { Mapper } from '../mapper.js';
import { namespaces } from '../namespaces.js';
import type { ToDcatapdeMapper } from '../to.dcatapde.mapper.js';
import type { ToElasticMapper } from '../to.elastic.mapper.js';
import type { DcatapSettings } from './dcatap.settings.js';
import { getLastPathSegment } from './dcatap.utils.js';

export type DcatapReference = { label?: string, uri?: string };

export type DcatapDistributionInfo = {
    format?: string,
    title?: string,
    description?: string,
    accessURLs: string[],
    downloadURLs: string[],
    endpointURLs: string[]
};

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

    /**
     * @returns all agents of the given property; unlike `extractAgents()`, any agent type is accepted
     */
    getAgents(predicateUri: string): Person[] {
        const agents: Person[] = [];
        for (const agentTerm of this.getObjects(this.datasetSubject, predicateUri)) {
            const agentSubject = agentTerm as Quad_Subject;
            const name = this.getFirstLiteral(agentSubject, namespaces.FOAF + 'name')
                ?? this.getFirstLiteral(agentSubject, namespaces.VCARD + 'fn')
                ?? this.getFirstLiteral(agentSubject, namespaces.RDFS + 'label');
            if (!name) {
                continue;
            }
            agents.push({
                name,
                mbox: (this.getFirstObject(agentSubject, namespaces.FOAF + 'mbox') ?? this.getFirstObject(agentSubject, namespaces.VCARD + 'hasEmail'))?.value.replace(/^mailto:/, ''),
                homepage: this.getFirstObject(agentSubject, namespaces.FOAF + 'homepage')?.value
            });
        }
        return agents;
    }

    getIdentifiers(): string[] {
        return this.getObjects(this.datasetSubject, namespaces.DCT + 'identifier').map(term => term.value);
    }

    /**
     * @returns the raw dct:issued value (`getIssued()` returns dct:modified)
     */
    getIssuedLiteral(): string | undefined {
        return this.getFirstLiteral(this.datasetSubject, namespaces.DCT + 'issued');
    }

    /**
     * @returns the dct:language values (IRIs or literals)
     */
    getLanguages(): string[] {
        return this.getObjects(this.datasetSubject, namespaces.DCT + 'language').map(term => term.value);
    }

    getPrefLabel(iri: string): string | undefined {
        return this.getFirstLiteral(iri, namespaces.SKOS + 'prefLabel');
    }

    /**
     * @returns dcat:landingPage values, followed by dct:landingPage values (used by some feeds instead)
     */
    getLandingPages(): string[] {
        return [
            ...this.getObjects(this.datasetSubject, namespaces.DCAT + 'landingPage'),
            ...this.getObjects(this.datasetSubject, namespaces.DCT + 'landingPage')
        ].map(term => term.value.trim()).filter(Boolean);
    }

    /**
     * @returns foaf:page documents: an IRI, or a blank node with a foaf:Document literal and dct:title
     */
    getPages(): DcatapReference[] {
        return this.getObjects(this.datasetSubject, namespaces.FOAF + 'page')
            .map(page => page.termType == 'NamedNode'
                ? { uri: page.value }
                : { uri: this.getFirstLiteral(page as Quad_Subject, namespaces.FOAF + 'Document'), label: this.getFirstLiteral(page as Quad_Subject, namespaces.DCT + 'title') })
            .filter(page => page.uri);
    }

    /**
     * @returns all dcat:distribution nodes (including dcat:DataService used as distribution) with their URLs
     */
    getDistributionInfos(): DcatapDistributionInfo[] {
        return (this.getObjects(this.datasetSubject, namespaces.DCAT + 'distribution') as Quad_Subject[]).map(distribution => ({
            format: this.getDistributionFormat(distribution),
            title: this.getFirstLiteral(distribution, namespaces.DCT + 'title'),
            description: this.getFirstLiteral(distribution, namespaces.DCT + 'description'),
            accessURLs: this.getObjects(distribution, namespaces.DCAT + 'accessURL').map(term => term.value),
            downloadURLs: this.getObjects(distribution, namespaces.DCAT + 'downloadURL').map(term => term.value),
            endpointURLs: this.getObjects(distribution, namespaces.DCAT + 'endpointURL').map(term => term.value)
        }));
    }

    private getDistributionFormat(distribution: Quad_Subject): string | undefined {
        const format = this.getFirstObject(distribution, namespaces.DCT + 'format') ?? this.getFirstObject(distribution, namespaces.DCAT + 'mediaType');
        if (!format) {
            return undefined;
        }
        if (format.termType == 'Literal') {
            return format.value.trim();
        }
        return this.getFirstLiteral(format as Quad_Subject, namespaces.RDFS + 'label')
            ?? this.getFirstLiteral(format as Quad_Subject, namespaces.RDF + 'value')
            ?? (format.termType == 'NamedNode' ? getLastPathSegment(format.value) : undefined);
    }

    /**
     * @returns the labels of dct:rights of all distributions, without duplicates
     */
    getRights(): string[] {
        const rights = new Set<string>();
        for (const distribution of this.getObjects(this.datasetSubject, namespaces.DCAT + 'distribution') as Quad_Subject[]) {
            this.getObjects(distribution, namespaces.DCT + 'rights')
                .map(term => this.getTermLabel(term))
                .filter(Boolean)
                .forEach(label => rights.add(label));
        }
        return [...rights];
    }

    /**
     * @returns the dct:license IRIs of the dataset and all distributions, without duplicates;
     * the label is the title from `def_licenses.rdf`, else the label of the license node
     */
    getLicenses(): DcatapReference[] {
        const licenses = new Map<string, DcatapReference>();
        const distributions = this.getObjects(this.datasetSubject, namespaces.DCAT + 'distribution') as Quad_Subject[];
        for (const subject of [this.datasetSubject, ...distributions]) {
            for (const term of this.getObjects(subject, namespaces.DCT + 'license')) {
                // JSON-LD `"@id": ""` resolves to the document URL - this is not a license
                if (term.termType != 'NamedNode' || term.value == this.settings.sourceURL || licenses.has(term.value)) {
                    continue;
                }
                const label = DcatLicensesUtils.get(term.value)?.title ?? this.getTermLabel(term);
                licenses.set(term.value, { label, uri: term.value });
            }
        }
        return [...licenses.values()];
    }

    /**
     * @returns dct:accessRights with a label (literal, labelled node or IRI)
     */
    getAccessRightsReferences(): DcatapReference[] {
        return this.getTermReferences(namespaces.DCT + 'accessRights');
    }

    getApplicableLegislation(): DcatapReference[] {
        return this.getTermReferences(namespaces.DCATAP + 'applicableLegislation');
    }

    getConformsTo(): DcatapReference[] {
        return this.getTermReferences(namespaces.DCT + 'conformsTo');
    }

    /**
     * @returns the first dct:provenance statement (literal or label)
     */
    getProvenance(): string | undefined {
        return this.getObjects(this.datasetSubject, namespaces.DCT + 'provenance')
            .map(term => this.getTermLabel(term, false))
            .find(Boolean);
    }

    private getTermReferences(predicateUri: string): DcatapReference[] {
        return this.getObjects(this.datasetSubject, predicateUri)
            .map(term => ({ label: this.getTermLabel(term), uri: term.termType == 'NamedNode' ? term.value : undefined }))
            .filter(reference => reference.label);
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
