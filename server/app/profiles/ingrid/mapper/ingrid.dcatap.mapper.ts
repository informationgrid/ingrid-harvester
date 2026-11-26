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

import turfBbox from '@turf/bbox';
import type { Geometry } from 'geojson';
import log4js from 'log4js';
import { DcatapIsoMapper } from '../../../importer/dcatap/dcatap.iso.mapper.js';
import { CRS_URL_PATTERN, DcatapMapper, INSPIRE_THEME_URL, ISO_METADATA_STANDARD_NAME, ISO_METADATA_STANDARD_VERSION } from '../../../importer/dcatap/dcatap.mapper.js';
import type { DateRange } from '../../../model/dateRange.js';
import type { Distribution } from '../../../model/distribution.js';
import type { IndexContact, IndexSpatial } from '../../../model/index.document.js';
import { DcatLicensesUtils } from '../../../utils/dcat.licenses.utils.js';
import * as MiscUtils from '../../../utils/misc.utils.js';
import * as XpathUtils from '../../../utils/xpath.utils.js';
import type { IngridDocumentType } from '../model/index.document.js';
import type { IngridOpendataDistribution } from '../model/opendataindex.document.js';
import type { IngridOpendataDeprecatedIndexDocument } from '../model/opendataindex.document.deprecated.js';
import { Codelist } from '../utils/codelist.js';
import { ingridMapper, type DocumentKind } from './ingrid.mapper.js';

const log = log4js.getLogger(import.meta.filename);

// DcatPeriodicityUtils codes (EU frequency vocabulary) → ISO MD_MaintenanceFrequencyCode
const ISO_MAINTENANCE_FREQUENCY: Record<string, string> = {
    ANNUAL: 'annually', ANNUAL_2: 'biannually', BIWEEKLY: 'fortnightly', CONT: 'continual', UPDATE_CONT: 'continual',
    DAILY: 'daily', IRREG: 'irregular', MONTHLY: 'monthly', NEVER: 'notPlanned', QUARTERLY: 'quarterly',
    UNKNOWN: 'unknown', WEEKLY: 'weekly'
};
const HVD_LEGISLATION_URL = 'http://data.europa.eu/eli/reg_impl/2023/138';
const EU_ACCESS_RIGHT_PUBLIC_URL = 'http://publications.europa.eu/resource/authority/access-right/PUBLIC';

export class ingridDcatapMapper<M extends DcatapMapper = DcatapMapper> extends ingridMapper<M> {

    // createGeometadata: the dataset is also exported as CSW ISO 19139 -> InGrid document instead of opendata
    protected getDefaultDocumentKind(): DocumentKind {
        return this.baseMapper.settings.createGeometadata ? 'ingrid' : 'opendata';
    }

    protected override getDocumentBuilders() {
        return {
            ...super.getDocumentBuilders(),
            'opendata-deprecated': () => this.buildOpendataDeprecatedDocument(),
            'ingrid-deprecated': () => this.buildIngridDeprecatedDocument(),
        };
    }

    // the pre-migration ("opendata") document shape - see ingridCkanMapper's equivalent for context
    private async buildOpendataDeprecatedDocument(): Promise<IngridOpendataDeprecatedIndexDocument> {
        const settings = this.baseMapper.settings;
        let result: IngridOpendataDeprecatedIndexDocument = {
            ...this.getCustomEntries(),
            iPlugId: settings.iPlugId,
            partner: settings.partner?.split(',').map(p => p.trim()),
            provider: settings.provider?.split(',').map(p => p.trim()),
            organisation: this.transformToIgcDomainId(settings.provider, "111"),
            datatype: settings.datatype?.split(',').map(p => p.trim()) ?? ["default"],
            dataSourceName: settings.dataSourceName,
            boost: settings.boost,
            isfolder: "false",
            metadata: {
                created: null,
                modified: this.getModifiedDate(),
            },
            id: this.getGeneratedId(),
            uuid: this.getGeneratedId(),
            modified: this.getModifiedDate(),
            collection: {
                name: settings.dataSourceName,
            },
            extras: {
                metadata: {
                    harvested: this.baseMapper.getHarvestingDate(),
                    harvesting_errors: null, // get errors after all operations been done
                    issued: null,
                    is_valid: null, // check validity before persisting to ES
                    modified: null,
                    source: this.baseMapper.getMetadataSource(),
                    merged_from: []
                }
            },
            sort_hash: this.getSortUuid(),
            content: null, // assigned after
            rdf: null, // assigned after,
            t01_object: {
                obj_id: this.getGeneratedId()
            },
            title: this.getTitle(),
            description: this.getDescription(),
            dcat: {
                landingPage: this.baseMapper.getLandingPage()
            },
            contacts: this.getOldContacts(),
            keywords: this.getKeywords(),
            legal_basis: this.getLegalBasis(),
            // getDistributions() is typed for the new shape (IngridOpendataDistribution) - use the base
            // importer mapper's distributions, matching the old field layout
            distributions: await this.baseMapper.getDistributions(),
            political_geocoding_level_uri: this.getPoliticalGeocodingLevel(),
            spatial: {
                geometries: this.getSpatial()
            },
            temporal: {
                "accrual_periodicity": "",
                "accrual_periodicity_key": ""
            }
        };
        result.content = this.getContent(result);
        // add "rdf" at the end, so it does not get included in the "content" array
        result.rdf = this.getHarvestedData();
        return result;
    }

    createCswIsoDocument(): string {
        return new DcatapIsoMapper(this.baseMapper).createCswIsoDocument();
    }

    getKeywords() {
        let result = [];
        let keywords = this.baseMapper.getKeywords();
        let themes = this.baseMapper.getThemes();
        keywords?.forEach(keyword => {
            if (this.hasValue(keyword) && !result.some(r => r.term === keyword)) {
                result.push({
                    term: keyword,
                    id: "",
                    source: "FREE",
                });
            }
        });
        themes?.forEach(theme => {
            if (this.hasValue(theme)) {
                const themeCode = theme.substring(theme.lastIndexOf("/") + 1);
                const themeEntry = Codelist.getInstance().getByData("6400", themeCode);
                if (themeEntry && !result.some(r => r.id === themeEntry.id && r.source === "THEMES")) {
                    result.push({
                        term: themeEntry.value,
                        id: themeEntry.id,
                        source: "THEMES",
                    });
                }
            }
        });
        return result;
    }

    // legal_basis and political_geocoding_level (dcatde:legalBasis, dcatde:politicalGeocodingLevelURI) are
    // DCAT-AP.de, mapped by ingridDcatapdeMapper only (ingridMapper returns undefined)

    // contacts in the pre-migration ("opendata-deprecated") shape
    protected getOldContacts(): any[] {
        return [
            ...this.baseMapper.getPublisher().map(contact => {return {role: this.getRoleId("publisher"), ...contact}}),
            ...this.baseMapper.getCreator().map(contact => {return {role: this.getRoleId("creator"), ...contact}}),
            ...this.baseMapper.getMaintainer().map(contact => {return {role: this.getRoleId("maintainer"), ...contact}}),
        ];
    }

    protected toIndexContact(role: string) {
        return (agent: { name: string, homepage?: string, mbox?: string }): IndexContact => {
            const communications: IndexContact['communications'] = [];
            if (agent.mbox) communications.push({ type: 'email', value: agent.mbox });
            if (agent.homepage) communications.push({ type: 'website', value: agent.homepage });
            return {
                role,
                name: agent.name,
                communications: communications.length ? communications : undefined,
            };
        };
    }

    async getContacts(): Promise<IndexContact[]> {
        return [
            ...this.baseMapper.getPublisher().map(this.toIndexContact('publisher')),
            ...this.baseMapper.getCreator().map(this.toIndexContact('creator')),
            ...this.baseMapper.getMaintainer().map(this.toIndexContact('maintainer')),
        ];
    }

    async getRdf(): Promise<string> {
        return this.getHarvestedData();
    }

    getLandingPage(): string {
        return this.baseMapper.getLandingPage();
    }

    getSpatials(): IndexSpatial[] {
        const geometry = this.baseMapper.getSpatial();
        return geometry ? [{ geometry, bbox: turfBbox(geometry) }] : undefined;
    }

    // live "ingrid" kind (createGeometadata) - the other ingrid.* fields are not mapped from DCAT-AP yet
    getDocumentType(): IngridDocumentType {
        return 'InGridGeoDataset';
    }

    getIso(): string {
        return this.createCswIsoDocument();
    }

    getDescription() {
        return this.baseMapper.getDescription();
    }

    // DCAT-AP temporal for the "ingrid-deprecated" getters (getT0/getT1/getT2/getT01_object); the new
    // index field (getTemporal(): IndexTemporal) is not mapped from DCAT-AP
    protected getDateRanges(): DateRange[] {
        return this.baseMapper.getTemporal();
    }

    getSpatial(): Geometry[] {
        const spatial = this.baseMapper.getSpatial();
        return spatial ? [spatial] : [];
    }

    getX1() {
        return this.getSpatial()[0]?.bbox?.[0];
    }

    getX2() {
        return this.getSpatial()[0]?.bbox?.[2];
    }

    getY1() {
        return this.getSpatial()[0]?.bbox?.[1];
    }

    getY2() {
        return this.getSpatial()[0]?.bbox?.[3];
    }

    getHierarchyLevel() {
        return 'dataset';
    }

    getAlternateTitle() {
        return this.baseMapper.getAlternativeTitles()[0];
    }

    // "ingrid-deprecated": the pre-merge output of this mapper (`main`) was the first alternative title as a
    // plain string, not an array like the CSW mappers - kept unchanged for the deprecated index format
    getAlternateTitleDeprecated(): string[] {
        return this.getAlternateTitle() as unknown as string[];
    }

    getT0() {
        const temporal = this.getDateRanges()?.[0];
        if (temporal && temporal.gte?.getTime() === temporal.lte?.getTime()) {
            return this.formatDate(temporal.gte);
        }
        return undefined;
    }

    getT1() {
        const temporal = this.getDateRanges()?.[0];
        if (temporal && temporal.gte?.getTime() !== temporal.lte?.getTime()) {
            return temporal.gte ? this.formatDate(temporal.gte) : '00000000';
        }
        return undefined;
    }

    getT2() {
        const temporal = this.getDateRanges()?.[0];
        if (temporal && temporal.gte?.getTime() !== temporal.lte?.getTime()) {
            return temporal.lte ? this.formatDate(temporal.lte) : '99999999';
        }
        return undefined;
    }

    getT01_object() {
        const language = this.transformGeneric(this.baseMapper.getIsoLanguage(), { ger: 'de', eng: 'en' }, 'de');
        const result = {
            ...super.getT01_object(),
            obj_class: '1',
            dataset_alternate_name: this.getAlternateTitle(),
            data_language_code: language,
            metadata_language_code: language,
            metadata_character_set: this.transformToIgcDomainId('utf8', '510'),
            metadata_standard_name: ISO_METADATA_STANDARD_NAME,
            metadata_standard_version: ISO_METADATA_STANDARD_VERSION,
            mod_time: this.getModifiedDate(),
            time_type: undefined,
            time_from: undefined,
            time_to: undefined,
            time_period: this.getTimePeriod()
        };
        const temporal = this.getDateRanges()?.[0];
        if (temporal) {
            if (temporal.gte && temporal.lte) {
                result.time_type = temporal.gte.getTime() === temporal.lte.getTime() ? 'am' : 'von';
            }
            else {
                result.time_type = temporal.gte ? 'seit' : 'bis';
            }
            result.time_from = temporal.gte ? this.formatDate(temporal.gte) : '00000000';
            result.time_to = temporal.lte ? this.formatDate(temporal.lte) : '99999999';
        }
        return result;
    }

    /**
     * @returns codelist 518 id of dct:accrualPeriodicity
     */
    private getTimePeriod(): string | undefined {
        const frequency = ISO_MAINTENANCE_FREQUENCY[this.baseMapper.getAccrualPeriodicity()];
        return frequency ? this.transformToIgcDomainId(frequency, '518') : undefined;
    }

    getT0113_dataset_reference() {
        const issued = this.baseMapper.getIssuedLiteral();
        const references = [
            { date: issued ? new Date(issued) : undefined, type: 'publication' },
            { date: this.getModifiedDate(), type: 'revision' }
        ];
        return this.nonEmpty(references
            .filter(reference => reference.date && !isNaN(reference.date.getTime()))
            .map(reference => ({
                reference_date: this.formatDate(reference.date),
                type: this.transformToIgcDomainId(reference.type, '502')
            })));
    }

    getAddress() {
        return this.nonEmpty(this.baseMapper.getParties().map(party => ({
            institution: party.organisationName,
            lastname: party.individualName,
            street: party.street,
            postcode: party.postalCode,
            city: party.city,
            administrative_area_value: party.region,
            country_code: party.country
        })));
    }

    getT012_obj_adr() {
        return this.nonEmpty(this.baseMapper.getParties().map(party => ({
            special_ref: '0',
            typ: this.transformToIgcDomainId(party.role, '505')
        })));
    }

    getT021_communication() {
        const communications = [];
        for (const party of this.baseMapper.getParties()) {
            for (const [commType, commValue] of [['Telefon', party.phone], ['Email', party.email], ['URL', party.url]]) {
                if (this.hasValue(commValue)) {
                    communications.push({ comm_type: commType, comm_value: commValue });
                }
            }
        }
        return this.nonEmpty(communications);
    }

    getT04Search() {
        const keywordTerms = [];
        const addTerm = (searchterm: string, type: string) => {
            if (this.hasValue(searchterm) && !keywordTerms.some(term => term.searchterm == searchterm)) {
                keywordTerms.push({ searchterm, type });
            }
        };
        const themes = this.baseMapper.getThemeReferences();
        themes.filter(theme => theme.uri?.startsWith(INSPIRE_THEME_URL)).forEach(theme => addTerm(theme.label, 'I'));
        this.baseMapper.getKeywords().forEach(keyword => addTerm(keyword.toLowerCase(), 'F'));
        themes.filter(theme => !theme.uri?.startsWith(INSPIRE_THEME_URL)).forEach(theme => addTerm(theme.label, 'F'));
        return this.nonEmpty(keywordTerms);
    }

    getLocation() {
        return this.baseMapper.getSpatialText();
    }

    getT011_obj_geo() {
        const result = {
            datasource_uuid: this.baseMapper.getIdentifiers()[0],
            referencesystem_id: this.getReferenceSystems(),
            special_base: this.baseMapper.getProvenance()
        };
        return Object.values(result).some(value => value !== undefined) ? result : undefined;
    }

    getT011_obj_geo_scale() {
        return this.nonEmpty(this.baseMapper.getSpatialResolutions().map(resolution => ({
            resolution_ground: String(resolution)
        })));
    }

    getSpatialSystem() {
        const referenceSystems = this.getReferenceSystems();
        return referenceSystems ? { referencesystem_value: referenceSystems } : undefined;
    }

    /**
     * @returns the CRS IRIs of dct:conformsTo
     */
    private getReferenceSystems(): string[] | undefined {
        return this.nonEmpty(this.baseMapper.getConformsTo().map(reference => reference.uri).filter(uri => CRS_URL_PATTERN.test(uri ?? '')));
    }

    getT017_url_ref() {
        return this.nonEmpty(this.baseMapper.getLinks().map(link => ({
            url_link: link.url,
            content: link.name ?? '',
            descr: link.description ?? '',
            special_ref: (link.function ? this.transformToIgcDomainId(link.function, '2000') : undefined) ?? '9999'
        })));
    }

    getT0110_avail_format() {
        return this.nonEmpty(this.baseMapper.getFormats().map(name => ({ name })));
    }

    getCapabilitiesURL() {
        return this.nonEmpty(this.baseMapper.getLinks()
            .map(link => link.url)
            .filter(url => /[?&]request=getcapabilities(&|$)/i.test(url) && /[?&]service=wms(&|$)/i.test(url)));
    }

    getObjectUse() {
        const rights = this.baseMapper.getRights();
        return rights.length ? { terms_of_use_value: rights } : undefined;
    }

    getObjectUseConstraintDeprecated() {
        const licenseKeys = [];
        const licenseValues = [];
        for (const license of this.baseMapper.getLicenses()) {
            licenseValues.push(license.label);
            const knownLicense = DcatLicensesUtils.get(license.uri);
            if (knownLicense) {
                licenseValues.push(JSON.stringify({ id: knownLicense.id, name: knownLicense.title, url: knownLicense.url, quelle: '' }));
                const entry = Codelist.getInstance().getEntries('6500').find(entry => this.parseJson(entry.data)?.id == knownLicense.id);
                if (entry) {
                    licenseKeys.push(entry.id);
                }
            }
        }
        if (!licenseValues.length) {
            return undefined;
        }
        return {
            ...(licenseKeys.length ? { license_key: licenseKeys } : {}),
            license_value: licenseValues
        };
    }

    getObjectAccess() {
        const accessRights = this.baseMapper.getAccessRightsReferences();
        if (!accessRights.length) {
            return undefined;
        }
        return {
            restriction_key: accessRights.map(accessRight => this.getRestrictionKey(accessRight.uri)),
            restriction_value: accessRights.map(accessRight => accessRight.label),
            terms_of_use: undefined
        };
    }

    /**
     * @returns codelist 6010 id of an INSPIRE LimitationsOnPublicAccess IRI, `1` for the EU access right PUBLIC, else `-1`
     */
    private getRestrictionKey(uri: string): string {
        if (!uri) {
            return '-1';
        }
        if (uri == EU_ACCESS_RIGHT_PUBLIC_URL) {
            return '1';
        }
        return Codelist.getInstance().getEntries('6010').find(entry => this.parseJson(entry.data)?.url == uri)?.id ?? '-1';
    }

    isHvd(): boolean {
        return this.baseMapper.getApplicableLegislation().some(legislation => legislation.uri?.startsWith(HVD_LEGISLATION_URL))
            || this.baseMapper.getHvdCategories().length > 0;
    }

    /**
     * @returns the array, or `undefined` if it is empty (geodata index fields without source data are omitted)
     */
    private nonEmpty<T>(values: T[]): T[] | undefined {
        return values.length ? values : undefined;
    }

    private parseJson(data: string): any {
        try {
            return data ? JSON.parse(data) : undefined;
        }
        catch {
            return undefined;
        }
    }

    getIDF() {
        const isoDocument = MiscUtils.getDomParser().parseFromString(this.createCswIsoDocument(), 'application/xml');
        let idf = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<html xmlns=\"http://www.portalu.de/IDF/1.0\">\n  <head/>\n  <body>\n";
        let renamedDom = XpathUtils.renameNodes("gmd:MD_Metadata", "idf:idfMdMetadata", isoDocument.documentElement);
        renamedDom = XpathUtils.renameNodes("gmd:CI_ResponsibleParty", "idf:idfResponsibleParty", renamedDom);
        idf += renamedDom.toString();
        idf += "\n  </body>\n</html>\n";
        return idf;
    }

    getRoleId(role: string){
        switch (role) {
            case "publisher": return 10;
            case "creator": return 11;
            case "maintainer": return  2;
            case "originator": return 6;
        }
        return role;
    }

    async getDistributionsDeprecated(): Promise<Distribution[]> {
        return await this.baseMapper.getDistributions();
    }

    async getDistributions(): Promise<IngridOpendataDistribution[]> {
        const distributions = await this.baseMapper.getDistributions();
        // DcatapMapper also sets languages and availability, which the base Distribution type does not declare
        return (distributions as (typeof distributions[number] & { languages?: string[], availability?: string })[])?.map(d => ({
            format: d.format?.[0],
            access_url: d.accessURL ?? d.access_url,
            modified: d.modified?.toISOString(),
            title: d.title,
            description: d.description,
            license: this.getDistributionLicense(d.license),
            languages: d.languages?.length ? d.languages : undefined,
            availability: d.availability || undefined,
        }));
    }
}
