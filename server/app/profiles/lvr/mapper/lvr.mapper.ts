/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import 'dayjs/locale/de';
import { createEsId } from '../lvr.utils';
import { GeometryInformation, DateRange, Keyword, LvrIndexDocument, Media, Relation } from '../model/index.document';
import { IndexDocumentFactory } from '../../../model/index.document.factory';
import { KldMapper } from 'importer/kld/kld.mapper';
import { License } from '@shared/license.model';
import { MetadataSource } from '../../../model/index.document';
import { OaiMapper } from '../../../importer/oai/lido/oai.mapper';

const dayjs = require('dayjs');
dayjs.locale('de');

export abstract class LvrMapper<M extends OaiMapper | KldMapper> implements IndexDocumentFactory<LvrIndexDocument> {

    protected baseMapper: M;

    constructor(baseMapper: M) {
        this.baseMapper = baseMapper;
    }

    async create(): Promise<LvrIndexDocument> {
        let result: LvrIndexDocument = {
            identifier: this.getIdentifier(),
            title: this.getTitle(),
            description: this.getDescription(),
            spatial: this.getSpatial(),
            temporal: this.getTemporal(),
            keywords: this.getKeywords(),
            relation: this.getRelations(),
            media: this.getMedia(),
            license: this.getLicense(),
            vector: this.getVector(),
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

    abstract getIdentifier(): string;

    abstract getTitle(): string;

    abstract getDescription(): string;

    abstract getSpatial(): GeometryInformation[];

    abstract getTemporal(): DateRange;

    abstract getKeywords(): Keyword[];

    abstract getRelations(): Relation[];

    abstract getMedia(): Media[];

    abstract getLicense(): License;

    abstract getVector(): object;

    abstract getIssued(): Date;

    abstract getModified(): Date;
}
