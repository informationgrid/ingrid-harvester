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

import type { Geometry } from 'geojson';
import log4js from 'log4js';
import { DcatapIsoMapper } from '../../../importer/dcatap/dcatap.iso.mapper.js';
import { DcatapMapper } from '../../../importer/dcatap/dcatap.mapper.js';
import type { ToElasticMapper } from '../../../importer/to.elastic.mapper.js';
import type { DateRange } from '../../../model/dateRange.js';
import type { Distribution } from '../../../model/distribution.js';
import type { IngridOpendataIndexDocument } from '../model/opendataindex.document.js';
import { Codelist } from '../utils/codelist.js';
import { ingridMapper } from './ingrid.mapper.js';

const log = log4js.getLogger(import.meta.filename);

export class ingridDcatapMapper extends ingridMapper<DcatapMapper> implements ToElasticMapper<IngridOpendataIndexDocument> {

    async createIndexDocument(): Promise<IngridOpendataIndexDocument> {
        // TODO this workaround should be removed once we have a unified index format
        if (this.baseMapper.settings.createGeometadata) {
            return await super.createIndexDocument() as any;
        }
        let result: IngridOpendataIndexDocument = {
            ...this.getIngridMetadata(this.baseMapper.settings),
            metadata: this.getMetaMetadata(),
            id: this.getGeneratedId(),
            uuid: this.getGeneratedId(),
            modified: this.getModifiedDate(),
            collection: {
                name: this.baseMapper.settings.dataSourceName,
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
            sort_hash: this.getSortHash(),
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
            contacts: this.getContacts(),
            keywords: this.getKeywords(),
            legal_basis: this.baseMapper.getLegalBasis(),
            distributions: await this.getDistributions(),
            political_geocoding_level_uri: this.baseMapper.getPoliticalGeocodingLevelURI(),
            spatial: {
                geometries: this.getSpatial()
            },
            // temporal: this.getTemporal(),
            temporal: {
                "accrual_periodicity": "",
                "accrual_periodicity_key": ""
            }
        };
        result.content = this.getContent(result);
        // add "rdf" at the end, so it does not get included in the "content" array
        result.rdf = "<?xml version='1.0' encoding='UTF-8'?><rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">" + this.getHarvestedData() + "</rdf:RDF>";

        this.executeCustomCode(result);

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

    getContacts() {
        return [
            ...this.baseMapper.getPublisher().map(contact => {return {role: this.getRoleId("publisher"), ...contact}}),
            ...this.baseMapper.getCreator().map(contact => {return {role: this.getRoleId("creator"), ...contact}}),
            ...this.baseMapper.getMaintainer().map(contact => {return {role: this.getRoleId("maintainer"), ...contact}}),
            ...this.baseMapper.getOriginator().map(contact => {return {role: this.getRoleId("originator"), ...contact}}),
        ];
    }

    getDescription() {
        return this.baseMapper.getDescription();
    }

    getTemporal(): DateRange[] {
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

    getAddress() {
        const organizations = [];
        const contact = this.baseMapper.getContactPoint();
        const organization = contact?.['organization-name'];
        if (organization && !organizations.some(o => o.institution == organization)) {
            organizations.push({
                "institution": organization
            });
        }
        return organizations;
    }

    getT021_communication() {
        const emails = [];
        const contact = this.baseMapper.getContactPoint();
        const email = contact?.hasEmail;
        if (email && !emails.some(m => m.comm_value == email)) {
            emails.push({
                "comm_type": "Email",
                "comm_value": email
            });
        }
        return emails;
    }

    getT04Search() {
        const keywordTerms = [];
        for (const keyword of this.baseMapper.getKeywords()) {
            if (keywordTerms.some(term => term.searchterm == keyword)) {
                continue;
            }
            keywordTerms.push({
                "searchterm": keyword,
                "type": "F"
            });
        }
        return keywordTerms;
    }

    getIDF() {
        return null;
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

    async getDistributions(): Promise<Distribution[]> {
        return await this.baseMapper.getDistributions();
    }
}
