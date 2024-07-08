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

import * as GeoJsonUtils from '../../../utils/geojson.utils';
import 'dayjs/locale/de';
import { createEsId } from '../lvr.utils';
import { GeometryInformation, Temporal } from '../../../model/index.document';
import { IndexDocumentFactory } from '../../../model/index.document.factory';
import { IngridIndexDocument, Spatial } from '../../../model/ingrid.index.document';
import { Keyword, LvrIndexDocument, Media, Person, Relation } from '../model/index.document';
import { KldMapper } from '../../../importer/kld/kld.mapper';
import { License } from '@shared/license.model';
import { OaiMapper as OaiLidoMapper } from '../../../importer/oai/lido/oai.mapper';
import { OaiMapper as OaiModsMapper } from '../../../importer/oai/mods/oai.mapper';

const dayjs = require('dayjs');
dayjs.locale('de');

export abstract class LvrMapper<M extends OaiLidoMapper | OaiModsMapper | KldMapper> implements IndexDocumentFactory<LvrIndexDocument> {

    protected baseMapper: M;

    constructor(baseMapper: M) {
        this.baseMapper = baseMapper;
    }

    async create(): Promise<LvrIndexDocument> {
        let ingridDocument: IngridIndexDocument = {
            id: this.getUrlSafeIdentifier(),
            schema_version: '1.0.0',
            title: this.getTitle()?.join('\n'),
            abstract: this.getDescription()?.join('\n'),
            spatial: this.getIngridSpatial(),
            temporal: {
                modified: this.getModified(),
                issued: this.getIssued(),
                data_temporal: this.getNullForTemporal(this.getTemporal()?.[0])
            },
            keywords: this.getKeywords()?.map(keyword => ({
                id: first(keyword.id),
                term: first(keyword.term),
                url: first(keyword.thesaurus)
            })),
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
                // title: this.getTitle(),
                // description: this.getDescription(),
                // spatial: this.getSpatial(),
                // temporal: this.getNullForTemporal(this.getTemporal()),
                // keywords: this.getKeywords(),
                genres: this.getGenres(),
                persons: this.getPersons(),
                media: this.getMedia(),
                relations: this.getRelations(),
                licenses: this.getLicense(),
                vector: this.getVector(),
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

    abstract getMedia(): Media[];

    abstract getRelations(): Relation[];

    abstract getLicense(): License[];

    abstract getVector(): object;

    abstract getIssued(): Date;

    abstract getModified(): Date;
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
