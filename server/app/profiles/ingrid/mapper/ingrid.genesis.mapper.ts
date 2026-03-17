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

import type { Geometry } from "geojson";
import { GenesisMapper } from '../../../importer/genesis/genesis.mapper.js';
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

    getSpatial(): Geometry[] {
        return null;
    }
}
