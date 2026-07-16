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

import { DOMImplementation } from '@xmldom/xmldom';
import { DCAT_FILE_TYPE_URL, DCAT_LANGUAGE_URL, ISO_639_1_TO_3 } from '../../../importer/dcatapde/dcatapde.utils.js';
import { GenesisMapper } from '../../../importer/genesis/genesis.mapper.js';
import { namespaces } from '../../../importer/namespaces.js';
import { UrlUtils } from '../../../utils/url.utils.js';
import { ensureNoEndSlash, generateUuid } from "../ingrid.utils.js";
import type { IndexContact } from '../../../model/index.document.js';
import type { IngridOpendataDistribution } from '../model/opendataindex.document.js';
import { ingridMapper } from './ingrid.mapper.js';

export class ingridGenesisMapper extends ingridMapper<GenesisMapper> {

    private _dcatapdeDoc: string | undefined;

    protected getDefaultDocumentKind(): 'ingrid' | 'opendata' {
        return 'opendata';
    }

    getCustomEntries(): object {
        return {
            uuid: this.baseMapper.getGeneratedId(),
            collection: { name: this.baseMapper.settings.dataSourceName },
            t01_object: { obj_id: this.baseMapper.getGeneratedId() },
            modified: this.getModifiedDate(),
            sort_hash: this.getSortUuid(),
        };
    }

    // the document id is the plain table code, as opposed to `uuid` (a hash of partner+code)
    getGeneratedId(): string {
        return this.baseMapper.getCode();
    }

    getDescription(): string {
        return this.baseMapper.getDescription();
    }

    async getRdf(): Promise<string> {
        return this.createDcatapdeDocument();
    }

    getDcat(): { landing_page?: string } {
        return { landing_page: this.baseMapper.getLandingPageUrl() };
    }

    getPoliticalGeocodingLevelUri(): string {
        return this.baseMapper.getSpatialUri();
    }

    async getContacts(): Promise<IndexContact[]> {
        return this.baseMapper.getContact().map(c => ({ role: 'publisher', name: c.name }));
    }

    async getDistributions(): Promise<IngridOpendataDistribution[]> {
        const distributions = this.baseMapper.getDistributions();
        return distributions?.map(d => ({
            format: d.format?.[0],
            access_url: d.accessURL ?? d.access_url,
            modified: d.modified?.toISOString(),
            title: d.title,
            description: d.description,
        }));
    }

    createDcatapdeDocument(): string {
        if (this._dcatapdeDoc === undefined) {
            this._dcatapdeDoc = this._buildDcatapdeDocument();
        }
        return this._dcatapdeDoc;
    }

    getKeywords(): any[] {
        const keywords = this.baseMapper.getKeywords() ?? [];
        // explicitly add "opendata" keyword if not already present
        if (!keywords.some(term => term.toLowerCase() === 'opendata')) {
            keywords.push('opendata');
        }
        return keywords.map(term => ({ term, source: 'FREE' }));
    }

    private getAccrualPeriodicityUri(): string | undefined {
        const FREQUENCY_BASE = 'http://publications.europa.eu/resource/authority/frequency/';
        const map: Record<string, string> = {
            'täglich':          'DAILY',
            'wöchentlich':      'WEEKLY',
            'zweiwöchentlich':  'BIWEEKLY',
            'monatlich':        'MONTHLY',
            'zweimonatlich':    'BIMONTHLY',
            'vierteljährlich':  'QUARTERLY',
            'quartalsweise':    'QUARTERLY',
            'halbjährlich':     'BIANNUAL',
            'jährlich':         'ANNUAL',
            'zweijährlich':     'BIENNIAL',
            'dreijährlich':     'TRIENNIAL',
            'unregelmäßig':     'IRREGULAR',
            'einmalig':         'NEVER',
        };
        const type = this.baseMapper.getFrequency();
        if (!type) return undefined;
        const key = type.toLowerCase();
        const code = map[key];
        return code ? FREQUENCY_BASE + code : undefined;
    }

    private _buildDcatapdeDocument(): string {
        const dom = new DOMImplementation();
        const doc = dom.createDocument(namespaces.RDF, 'rdf:RDF', null);
        const rdfRoot = doc.documentElement;
        rdfRoot.setAttribute('xmlns:dcat', namespaces.DCAT);
        rdfRoot.setAttribute('xmlns:dct', namespaces.DCT);
        rdfRoot.setAttribute('xmlns:dcatde', namespaces.DCATDE);
        rdfRoot.setAttribute('xmlns:foaf', namespaces.FOAF);
        rdfRoot.setAttribute('xmlns:vcard', namespaces.VCARD);

        const dataset = doc.createElement('dcat:Dataset');
        rdfRoot.appendChild(dataset);

        dataset.appendChild(doc.createElement('dct:title')).textContent = this.baseMapper.getTitle();
        dataset.appendChild(doc.createElement('dct:description')).textContent = this.baseMapper.getDescription();

        const tableUri = ensureNoEndSlash(this.baseMapper.settings.sourceURL) + '/table/' + this.baseMapper.getCode();
        const identifierEl = doc.createElement('dct:identifier');
        identifierEl.setAttribute('rdf:resource', tableUri);
        dataset.appendChild(identifierEl);

        const addDate = (parent: Element, tag: string, date: Date) => {
            const el = doc.createElement(tag);
            el.setAttribute('rdf:datatype', namespaces.XSD + '#dateTime');
            el.textContent = date.toISOString();
            parent.appendChild(el);
        };

        const modified = this.getModifiedDate();
        if (modified) {
            addDate(dataset, 'dct:modified', modified);
        }

        const temporal = this.baseMapper.getTemporal();
        if (temporal) {
            const period = doc.createElement('dct:temporal');
            const periodOfTime = doc.createElement('dct:PeriodOfTime');
            if (temporal.gte) {
                addDate(periodOfTime, 'dcat:startDate', temporal.gte);
            }
            if (temporal.lte) {
                addDate(periodOfTime, 'dcat:endDate', temporal.lte);
            }
            period.appendChild(periodOfTime);
            dataset.appendChild(period);
        }

        for (const keyword of this.getKeywords()) {
            dataset.appendChild(doc.createElement('dcat:keyword')).textContent = keyword.term;
        }

        const theme = this.baseMapper.getTheme();
        if (theme) {
            const themeEl = doc.createElement('dcat:theme');
            themeEl.setAttribute('rdf:resource', theme);
            dataset.appendChild(themeEl);
        }

        const accrualPeriodicityUri = this.getAccrualPeriodicityUri();
        if (accrualPeriodicityUri) {
            const periodicityEl = doc.createElement('dct:accrualPeriodicity');
            periodicityEl.setAttribute('rdf:resource', accrualPeriodicityUri);
            dataset.appendChild(periodicityEl);
        }

        const licenseUrl = this.baseMapper.getLicenseUrl();
        const distributions = this.baseMapper.getDistributions();
        for (const dist of distributions) {
            const distId = `urn:uuid:${generateUuid([dist.access_url])}`;
            const distEl = doc.createElement('dcat:distribution');
            distEl.setAttribute('rdf:resource', distId);
            const distNode = doc.createElement('dcat:Distribution');
            distNode.setAttribute('rdf:about', distId);
            if (dist.title) {
                distNode.appendChild(doc.createElement('dct:title')).textContent = dist.title;
            }
            if (dist.access_url) {
                const accessEl = doc.createElement('dcat:accessURL');
                accessEl.setAttribute('rdf:resource', dist.access_url);
                distNode.appendChild(accessEl);
            }
            if (dist.format?.[0]) {
                const formatCode = UrlUtils.mapFormat([dist.format[0]])[0];
                const formatIri = formatCode.startsWith('http')
                    ? formatCode
                    : DCAT_FILE_TYPE_URL + formatCode;
                const formatEl = doc.createElement('dct:format');
                formatEl.setAttribute('rdf:resource', formatIri);
                distNode.appendChild(formatEl);
            }
            if (dist.modified) {
                addDate(distNode, 'dct:modified', dist.modified);
            }
            if (licenseUrl) {
                const licEl = doc.createElement('dct:license');
                licEl.setAttribute('rdf:resource', licenseUrl);
                distNode.appendChild(licEl);
            }
            // interface-search cannot handle correct RDF/XML. we have to serve its preferred format
            rdfRoot.appendChild(distNode);
            dataset.appendChild(distEl);
        }

        const publisher = this.baseMapper.getPublisher();
        if (publisher) {
            const pubEl = doc.createElement('dct:publisher');
            const orgEl = doc.createElement('foaf:Agent');
            orgEl.appendChild(doc.createElement('foaf:name')).textContent = publisher.name;
            pubEl.appendChild(orgEl);
            dataset.appendChild(pubEl);

            if (publisher.email) {
                const contactEl = doc.createElement('dcat:contactPoint');
                const vcardEl = doc.createElement('vcard:Organization');
                vcardEl.appendChild(doc.createElement('vcard:fn')).textContent = publisher.name;
                vcardEl.appendChild(doc.createElement('vcard:hasEmail')).textContent = publisher.email;
                contactEl.appendChild(vcardEl);
                dataset.appendChild(contactEl);
            }
        }

        const contributorId = this.baseMapper.getContributorId();
        if (contributorId) {
            const contribEl = doc.createElement('dcatde:contributorID');
            contribEl.setAttribute('rdf:resource', contributorId);
            dataset.appendChild(contribEl);
        }

        const language = this.baseMapper.getLanguage();
        if (language) {
            const iso3 = ISO_639_1_TO_3[language] ?? language.toUpperCase();
            const langEl = doc.createElement('dct:language');
            langEl.setAttribute('rdf:resource', DCAT_LANGUAGE_URL + iso3);
            dataset.appendChild(langEl);
        }

        const spatialUri = this.baseMapper.getSpatialUri();
        if (spatialUri) {
            const spatialEl = doc.createElement('dct:spatial');
            spatialEl.setAttribute('rdf:resource', spatialUri);
            dataset.appendChild(spatialEl);
        }

        const landingPageUrl = this.baseMapper.getLandingPageUrl();
        if (landingPageUrl) {
            const landingPageEl = doc.createElement('dcat:landingPage');
            landingPageEl.setAttribute('rdf:resource', landingPageUrl);
            dataset.appendChild(landingPageEl);
        }

        // return '<?xml version="1.0" encoding="utf-8"?>\n' + prettyPrintXml(doc.toString());
        return '<?xml version="1.0" encoding="utf-8"?>\n' + doc.toString();
    }
}
