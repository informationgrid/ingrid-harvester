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

import { Geometry } from '@turf/helpers';
import { IndexDocumentFactory } from '../../../model/index.document.factory';
import { MetadataSource } from '../../../model/index.document';
import { WfsMapper } from '../../../importer/wfs/wfs.mapper';
import { ZdmIndexDocument } from '../model/index.document';

export abstract class ZdmMapper<M extends WfsMapper> implements IndexDocumentFactory<ZdmIndexDocument> {

    protected baseMapper: M;

    constructor(baseMapper: M) {
        this.baseMapper = baseMapper;
    }

    async create(): Promise<ZdmIndexDocument> {
        let bbox = this.getBoundingBox().bbox;
        let result: ZdmIndexDocument = {
            t01_object: {
                obj_id: this.getGeneratedId()
            },
            title: this.getTitle(),
            summary: this.getDescription(),
            x1: bbox?.[0],
            y1: bbox?.[1],
            x2: bbox?.[2],
            y2: bbox?.[3],
            additional_html_1: this.getAdditionalHtml(),
            is_feature_type: this.isFeatureType(),
            typename: this.getFeatureTypeName(),
            number_of_features: this.getNumberOfFeatures(),
            feature_attributes: this.getAttributes(),

            // dataSourceName: this.getDataSourceName(),
            partner: [
                "bund"
            ],
            datatype: [
                "default",
                "metadata",
                "IDF_1.0",
                "dsc_wfs",
                "wfs"
            ],
            provider: [
                "bu_kug"
            ],

            idf: this.getIdf(), // will be augmented during aggregation, in `server/app/profiles/zdm/persistence/postgres.aggregator.ts`
            extras: {
                metadata: {
                    issued: this.getIssued(),
                    modified: this.getModifiedDate(),
                    source: this.getMetadataSource(),
                    merged_from: []
                }
            }
        };

        // result.extras.metadata.harvesting_errors = this.getHarvestErrors();
        // result.extras.metadata.is_valid = this.isValid();
        this.executeCustomCode(result);

        return result;
    }

    // returns child features if this is a featuretype, else null
    abstract getFeatures(): ZdmIndexDocument[];

    isFeatureType(): boolean {
        return this.baseMapper.isFeatureType();
    }

    getFeatureTypeName(): string {
        return this.baseMapper.getTypename(false);
    }

    getNumberOfFeatures(): number {
        return this.isFeatureType() ? this.baseMapper.getNumberOfFeatures() : null;
    }

    abstract getAttributes(): string[];

    abstract getAdditionalHtml(): string;

    abstract getIdf(): string;

    getTitle(): string{
        return this.baseMapper.getTitle();
    }

    getDescription(): string{
        return this.baseMapper.getDescription() + ` - ${this.getNumberOfFeatures()} Feature(s)`;
    }

    getBoundingBox(): Geometry {
        return this.baseMapper.getBoundingBox();
    }

    getModifiedDate(): Date{
        return this.baseMapper.getModifiedDate()
    }

    getGeneratedId(): string{
        return this.baseMapper.getGeneratedId()
    }

    getMetadataSource(): MetadataSource {
        return this.baseMapper.getMetadataSource();
    }

    getIssued(): Date {
        return this.baseMapper.getIssued();
    }

    executeCustomCode(doc: ZdmIndexDocument) {
        this.baseMapper.executeCustomCode(doc);
    }
}
