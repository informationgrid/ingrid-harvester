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
import type { RequestOptions } from '../../utils/http-request.utils.js';
import { RequestDelegate } from '../../utils/http-request.utils.js';
import { UrlUtils } from '../../utils/url.utils.js';
import { DCAT_LANGUAGE_URL } from '../dcatapde/dcatapde.utils.js';
import { Mapper } from '../mapper.js';
import { namespaces } from '../namespaces.js';
import type { ToDcatapdeMapper } from '../to.dcatapde.mapper.js';
import type { ToElasticMapper } from '../to.elastic.mapper.js';
import type { DcatapSettings } from './dcatap.settings.js';

export class DcatapMapper extends Mapper<DcatapSettings> implements ToElasticMapper<IndexDocument>, ToDcatapdeMapper {

    private readonly datasetSubject: Quad_Subject;
    private readonly store: Store;
    private readonly rawPayload: string;
    private harvestTime: Date;
    private readonly uuid: string;

    private fetched: any = {
        contactPoint: null,
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
        let description = this.getFirstLiteral(this.datasetSubject, namespaces.DCT + 'description');
        if (!description) {
            description = this.getFirstLiteral(this.datasetSubject, namespaces.DCT + 'abstract');
        }
        if (!description) {
            const msg = `Dataset doesn't have an description. It will not be displayed in the portal. Id: '${this.uuid}', title: '${this.getTitle()}', source: '${this.settings.sourceURL}'`;
            this.log.warn(msg);
            this.summary.warnings.push(['No description', msg]);
            this.valid = false;
            return undefined;
        }
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
                license = {
                    name: licenseInfo.title,
                    url: licenseInfo.url
                };
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
        const keywords = keywordTerms.map(t => t.value).filter(Boolean);

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
        const spatialTerms = this.getObjects(this.datasetSubject, namespaces.DCT + 'spatial');
        for (const spatialTerm of spatialTerms) {
            const spatialSubject = spatialTerm as Quad_Subject;

            const geoTerms = [
                ...this.getObjects(spatialSubject, namespaces.LOCN + 'geometry'),
                ...this.getObjects(spatialSubject, namespaces.OGC + 'asWKT')
            ];

            // 1. Check GeoJSON first
            for (const geoTerm of geoTerms) {
                if (geoTerm.termType === 'Literal') {
                    if (geoTerm.datatype?.value === 'https://www.iana.org/assignments/media-types/application/vnd.geo+json' || geoTerm.value.trim().startsWith('{')) {
                        try {
                            return JSON.parse(geoTerm.value);
                        }
                        catch (ignored) {}
                    }
                }
            }

            // 2. Check WKT fallback
            for (const geoTerm of geoTerms) {
                if (geoTerm.termType === 'Literal') {
                    if (geoTerm.datatype?.value === 'http://www.opengis.net/rdf#WKTLiteral' ||
                        geoTerm.datatype?.value === namespaces.GEOSPARQL + 'wktLiteral' ||
                        geoTerm.value.trim().startsWith('POLYGON') ||
                        geoTerm.value.trim().startsWith('POINT') ||
                        geoTerm.value.trim().startsWith('MULTIPOLYGON')) {
                        return this.wktToGeoJson(geoTerm.value);
                    }
                }
            }
        }
        return undefined;
    }

    getSpatialText(): string | undefined {
        const spatialTerms = this.getObjects(this.datasetSubject, namespaces.DCT + 'spatial');
        for (const spatialTerm of spatialTerms) {
            const prefLabel = this.getFirstLiteral(spatialTerm as Quad_Subject, namespaces.SKOS + 'prefLabel');
            if (prefLabel) {
                return prefLabel;
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
        if (this.fetched.themes) return this.fetched.themes;

        const themeTerms = this.getObjects(this.datasetSubject, namespaces.DCAT + 'theme');
        const themes = themeTerms.map(t => t.value).filter(Boolean);

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
                    license = await DcatLicensesUtils.get(licenseObj.value);
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

    getContactPoint(): Contact {
        if (this.fetched.contactPoint) {
            return this.fetched.contactPoint;
        }

        const infos: Contact = { fn: null };
        const contactTerms = this.getObjects(this.datasetSubject, namespaces.DCAT + 'contactPoint');

        if (contactTerms.length > 0) {
            const contactSubject = contactTerms[0] as Quad_Subject;

            const name = this.getFirstLiteral(contactSubject, namespaces.VCARD + 'fn');
            const org = this.getFirstLiteral(contactSubject, namespaces.VCARD + 'organization-name');
            const region = this.getFirstLiteral(contactSubject, namespaces.VCARD + 'region');
            const country = this.getFirstLiteral(contactSubject, namespaces.VCARD + 'hasCountryName');
            const postCode = this.getFirstLiteral(contactSubject, namespaces.VCARD + 'hasPostalCode');
            const emailObj = this.getFirstObject(contactSubject, namespaces.VCARD + 'hasEmail');
            const phoneObj = this.getFirstObject(contactSubject, namespaces.VCARD + 'hasTelephone');
            const urlObj = this.getFirstObject(contactSubject, namespaces.VCARD + 'hasURL');

            if (name) infos.fn = name;
            if (org) infos['organization-name'] = org;
            if (region) infos.hasRegion = region;
            if (country) infos.hasCountryName = country.trim();
            if (postCode) infos.hasPostalCode = postCode;
            if (emailObj) infos.hasEmail = emailObj.value.replace(/^mailto:/, '');
            if (phoneObj) infos.hasTelephone = phoneObj.value.replace(/^tel:/, '');
            if (urlObj) infos.hasURL = urlObj.value;
        }

        this.fetched.contactPoint = infos;
        return infos;
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
