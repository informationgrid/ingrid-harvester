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
import { CkanMapper } from "../../../importer/ckan/ckan.mapper.js";
import type { DateRange } from "../../../model/dateRange.js";
import type { IngridOpendataIndexDocument } from "../model/opendataindex.document.js";
import { ingridMapper } from './ingrid.mapper.js';
import {Codelist} from "../utils/codelist.js";
import type {Distribution} from "../../../model/distribution.js";

const log = log4js.getLogger(import.meta.filename);

export class ingridCkanMapper extends ingridMapper<CkanMapper> {

    async createIndexDocument(): Promise<IngridOpendataIndexDocument> {
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
            description: this.baseMapper.getDescription(),
            dcat: {
                landingPage: null,//this.getLandingPage()
            },
            contacts: this.getContacts(),
            keywords: this.getKeywords(),
            legal_basis: null,//this.getLegalBasis(),
            distributions: await this.getDistributions(),
            political_geocoding_level_uri: null,//this.getPoliticalGeocodingLevelURI(),
            spatial: this.getSpatial(),
            // temporal: this.getTemporal(),
            temporal: {
                "accrual_periodicity": "",
                "accrual_periodicity_key": ""
            }
        };
        result.content = this.getContent(result);
        // add "rdf" at the end, so it does not get included in the "content" array
        result.rdf = this.baseMapper.getDcatapde();

        this.executeCustomCode(result);

        return result;
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
                theme = theme.substring(theme.lastIndexOf("/") + 1)
                const themeEntry = Codelist.getInstance().getByData("6400", theme)
                if(!result.some(r => r.id === themeEntry.id && r.source === "THEMES")) {
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
            //...super.getPublisher().map(contact => {return {role: "publisher", ...contact}}),
            //...super.getCreator().map(contact => {return {role: "creator", ...contact}}),
            //...super.getMaintainer().map(contact => {return {role: "maintainer", ...contact}}),
            //...super.getOriginator().map(contact => {return {role: "originator", ...contact}}),
            ];
    }

    getSpatial(): any {
        return {geometries: [this.baseMapper.getSpatial()]};
    }

    getTemporal(): DateRange[] {
        return this.baseMapper.getTemporal();
    }

    async getDistributions(): Promise<Distribution[]> {
        return await this.baseMapper.getDistributions();
    }
}
