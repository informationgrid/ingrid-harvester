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

import { DOMImplementation } from "@xmldom/xmldom";
import { GenesisMapper } from '../../../importer/genesis/genesis.mapper.js';
import { DCAT_FILE_TYPE_URL, DCAT_LANGUAGE_URL, ISO_639_1_TO_3, prettyPrintXml } from '../../../importer/dcatapde/dcatapde.utils.js';
import { namespaces } from '../../../importer/namespaces.js';
import { UrlUtils } from '../../../utils/url.utils.js';
import type { IngridOpendataIndexDocument } from '../model/opendataindex.document.js';
import { ingridMapper } from "./ingrid.mapper.js";

export class ingridGenesisMapper extends ingridMapper<GenesisMapper> {

    async createIndexDocument(): Promise<IngridOpendataIndexDocument> {
        let result: IngridOpendataIndexDocument = {
            ...this.getIngridMetadata(this.baseMapper.getSettings()),
            id: this.getGeneratedId(),
            uuid: this.getGeneratedId(),
            title: this.getTitle(),
            description: this.baseMapper.getDescription(),
            modified: this.getModifiedDate(),
            collection: {
                name: this.baseMapper.getSettings().dataSourceName,
            },
            t01_object: {
                obj_id: this.getGeneratedId(),
            },
            extras: {
                metadata: {
                    harvested: this.baseMapper.getHarvestingDate(),
                    harvesting_errors: null,
                    issued: null,
                    is_valid: null,
                    modified: null,
                    source: this.baseMapper.getMetadataSource(),
                    merged_from: [],
                },
            },
            spatial: null,
            temporal: [this.baseMapper.getTemporal()].filter(Boolean),
            contacts: [],
            keywords: this.baseMapper.getKeywords().map(term => ({ term, type: 'free' })),
            distributions: this.baseMapper.getDistributions(),
            dcat: { landingPage: null },
            legalBasis: null,
            political_geocoding_level_uri: null,
            rdf: null,
            sort_hash: this.getSortHash(),
            content: null,
        };
        result.content = [...new Set(this.getContent(result))];
        this.executeCustomCode(result);
        return result;
    }

    createDcatapdeDocument(): string {
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
        const identifierEl = doc.createElement('dct:identifier');
        identifierEl.setAttribute('rdf:resource', this.getGeneratedId());
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

        for (const keyword of this.baseMapper.getKeywords()) {
            dataset.appendChild(doc.createElement('dcat:keyword')).textContent = keyword;
        }

        const theme = this.baseMapper.getTheme();
        if (theme) {
            const themeEl = doc.createElement('dcat:theme');
            themeEl.setAttribute('rdf:resource', theme);
            dataset.appendChild(themeEl);
        }

        const licenseUrl = this.baseMapper.getLicenseUrl();
        const distributions = this.baseMapper.getDistributions();
        for (const dist of distributions) {
            const distEl = doc.createElement('dcat:distribution');
            const distNode = doc.createElement('dcat:Distribution');
            if (dist.accessURL) {
                const accessEl = doc.createElement('dcat:accessURL');
                accessEl.setAttribute('rdf:resource', dist.accessURL);
                distNode.appendChild(accessEl);
            }
            if (dist.downloadURL) {
                const downloadEl = doc.createElement('dcat:downloadURL');
                downloadEl.setAttribute('rdf:resource', dist.downloadURL);
                distNode.appendChild(downloadEl);
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
            if (licenseUrl) {
                const licEl = doc.createElement('dct:license');
                licEl.setAttribute('rdf:resource', licenseUrl);
                distNode.appendChild(licEl);
            }
            distEl.appendChild(distNode);
            dataset.appendChild(distEl);
        }

        const publisher = this.baseMapper.getPublisher();
        if (publisher) {
            const pubEl = doc.createElement('dct:publisher');
            const orgEl = doc.createElement('foaf:Organization');
            orgEl.appendChild(doc.createElement('foaf:name')).textContent = publisher.name;
            pubEl.appendChild(orgEl);
            dataset.appendChild(pubEl);

            if (publisher.email) {
                const contactEl = doc.createElement('dcat:contactPoint');
                const vcardEl = doc.createElement('vcard:Organization');
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

        return '<?xml version="1.0" encoding="utf-8"?>\n' + prettyPrintXml(doc.toString());
    }
}
