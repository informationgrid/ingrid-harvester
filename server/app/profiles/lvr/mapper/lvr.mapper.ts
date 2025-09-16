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

import * as GeoJsonUtils from '../../../utils/geojson.utils.js';
import 'dayjs/locale/de.js';
import { createEsId } from '../lvr.utils.js';
import { v5 as uuidv5 } from 'uuid';
import type { GeometryInformation, Temporal } from '../../../model/index.document.js';
import type { IndexDocumentFactory } from '../../../model/index.document.factory.js';
import type { IngridIndexDocument, Keyword, Spatial } from '../../../model/ingrid.index.document.js';
import type { JsonMapper } from '../../../importer/json/json.mapper.js';
import type { KldMapper } from '../../../importer/kld/kld.mapper.js';
import type { License } from '@shared/license.model.js';
import type { LvrIndexDocument, Media, Person, Relation, Source } from '../model/index.document.js';
import type { OaiMapper as OaiLidoMapper } from '../../../importer/oai/lido/oai.mapper.js';
import type { OaiMapper as OaiModsMapper } from '../../../importer/oai/mods/oai.mapper.js';
import dayjs from "dayjs";
dayjs.locale('de');
const UUID_NAMESPACE = '0afd6f59-d498-4da3-8919-1890d718d69e'; // randomly generated using uuid.v4

export abstract class LvrMapper<M extends OaiLidoMapper | OaiModsMapper | KldMapper | JsonMapper> implements IndexDocumentFactory<LvrIndexDocument> {

    protected baseMapper: M;

    constructor(baseMapper: M) {
        this.baseMapper = baseMapper;
    }

    async create(): Promise<LvrIndexDocument> {
        // ignore empty date ranges
        const temporals = this.getTemporal()?.filter((t: Temporal) => t.date_range.gte || t.date_range.lte);

        let ingridDocument: IngridIndexDocument = {
            id: this.getUrlSafeIdentifier(),
            sort_uuid: this.getGeneratedUUID(),
            schema_version: '0.0.2-SNAPSHOT',
            title: this.getTitle()?.join('\n'),
            description: this.getDescription()?.join('\n'),
            spatial: this.getIngridSpatial(),
            temporal: {
                modified: this.getModified(),
                issued: this.getIssued(),
                data_temporal: temporals ? this.getNullForTemporal(temporals[0]) : null
            },
            keywords: this.getKeywords(),
            fulltext: this.baseMapper.getHarvestedData(),
            metadata: {
                issued: this.getIssued(),
                modified: this.getModified(),
                source: this.baseMapper.getMetadataSource()
            }
        };

        let result: LvrIndexDocument = {
            ...ingridDocument,
            lvr: {
                identifier: this.getIdentifier(),
                genres: this.getGenres(),
                persons: this.getPersons(),
                media: await this.getMedia(),
                relations: this.getRelations(),
                licenses: this.getLicense(),
                vector: this.getVector(),
                source: await this.getSource()
            },
            extras: {
                metadata: {
                    issued: this.getIssued(),
                    modified: this.getModified(),
                    source: this.baseMapper.getMetadataSource(),
                    merged_from: []
                }
            }
        };

        result.extras.metadata.merged_from.push(createEsId(result));
        result.extras.metadata.harvesting_errors = this.baseMapper.getHarvestingErrors();
        // result.extras.metadata.is_valid = mapper.isValid(result);
        // let qualityNotes = mapper.getQualityNotes();
        // if (qualityNotes?.length > 0) {
        //     result.extras.metadata['quality_notes'] = qualityNotes;
        // }
        this.baseMapper.executeCustomCode(result);

        return result;
    }

    getUrlSafeIdentifier(): string {
        return this.getIdentifier().replace(/\//g, '-');
    }

    private getNullForTemporal(temporal: Temporal) {
        if (!temporal?.date_range?.gte && !temporal?.date_range?.lte) {
            return { ...temporal, date_range: null };
        }
        return temporal;
    }

    private getIngridSpatial(): Spatial {
        let spatial: Spatial = {};
        let geoInfo = this.getSpatial()?.[0];
        if (geoInfo) {
            spatial.bbox = GeoJsonUtils.getBbox(geoInfo.geometry);
            spatial.centroid = geoInfo.centroid;
            spatial.geometry = geoInfo.geometry;
            spatial.title = geoInfo.description;
        }
        return spatial;
    }

    abstract getIdentifier(): string;

    abstract getTitle(): string[];

    abstract getDescription(): string[];

    abstract getSpatial(): GeometryInformation[];

    abstract getTemporal(): Temporal[];

    abstract getKeywords(): Keyword[];

    abstract getGenres(): string[];

    abstract getPersons(): Person[];

    abstract getMedia(): Promise<Media[]>;

    abstract getRelations(): Relation[];

    abstract getLicense(): License[];

    abstract getVector(): object;

    abstract getSource(): Promise<Source>;

    abstract getIssued(): Date;

    abstract getModified(): Date;

    getGeneratedUUID(): string {
        return uuidv5(this.getUrlSafeIdentifier(), UUID_NAMESPACE);
    }
}

function first(strOrArr: string | string[]): string {
    if (!strOrArr) {
        return null;
    }
    if (Array.isArray(strOrArr)) {
        return strOrArr[0];
    }
    return strOrArr;
}
