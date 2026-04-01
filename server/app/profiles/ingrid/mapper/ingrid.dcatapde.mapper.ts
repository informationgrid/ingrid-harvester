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

import log4js from 'log4js';
import { DcatapdeMapper } from "../../../importer/dcatapde/dcatapde.mapper.js";
import type { ToElasticMapper } from '../../../importer/to.elastic.mapper.js';
import type { DateRange } from "../../../model/dateRange.js";
import type { IndexDocument } from '../../../model/index.document.js';
import type { IngridMetadata } from '../model/ingrid.metadata.js';
import type { IngridOpendataIndexDocument } from "../model/opendataindex.document.js";
import { ingridMapper } from './ingrid.mapper.js';
import type {Distribution} from "../../../model/distribution.js";

const log = log4js.getLogger(import.meta.filename);

export class ingridDcatapdeMapper extends ingridMapper<DcatapdeMapper> implements ToElasticMapper<IngridOpendataIndexDocument> {

    async createIndexDocument(): Promise<IngridOpendataIndexDocument> {
        let result: IngridOpendataIndexDocument = {
            ...this.getIngridMetadata(this.baseMapper.getSettings()),
            metadata: this.getMetaMetadata(),
            id: this.getGeneratedId(),
            uuid: this.getGeneratedId(),
            modified: this.getModifiedDate(),
            collection: {
                name: this.baseMapper.getSettings().dataSourceName,
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
            // distributions: await this.getDistributions(),
            sort_hash: this.getSortHash(),
            content: null, // assigned after
            rdf: null, // assigned after,
            t01_object: {
                obj_id: this.getGeneratedId()
            },
            title: this.getTitle(),
            description: this.baseMapper.getDescription(),
            dcat: {
                landingPage: this.baseMapper.getLandingPage()
            },
            contacts: this.getContacts(),
            keywords: this.getKeywords(),
            legal_basis: this.baseMapper.getLegalBasis(),
            distributions: await this.getDistributions(),
            political_geocoding_level_uri: this.baseMapper.getPoliticalGeocodingLevelURI(),
            spatial: {
                geometries: [this.baseMapper.getSpatial()]
            },
            // temporal: this.getTemporal(),
            temporal: {
                "accrual_periodicity": "",
                "accrual_periodicity_key": ""
            }
        };
        result.content = this.getContent(result);
        // add "rdf" at the end, so it does not get included in the "content" array
        result.rdf = this.getHarvestedData();

        this.executeCustomCode(result);

        return result;
    }

    getKeywords() {
        let result = [];
        let keywords = this.baseMapper.getKeywords();
        keywords?.forEach(keyword => {
            if (this.hasValue(keyword) && !result.some(r => r.term === keyword)) {
                result.push({
                    term: keyword,
                    id: "",
                    source: "FREE",
                });
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

    getTemporal(): DateRange[] {
        return this.baseMapper.getTemporal();
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
