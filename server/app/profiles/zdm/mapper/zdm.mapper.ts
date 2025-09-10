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
import { IndexDocumentFactory } from '../../../model/index.document.factory.js';
import type { MetadataSource } from '../../../model/index.document.js';
import { WfsMapper } from '../../../importer/wfs/wfs.mapper.js';
import type { ZdmIndexDocument } from '../model/index.document.js';

export abstract class ZdmMapper<M extends WfsMapper> implements IndexDocumentFactory<ZdmIndexDocument> {

    readonly baseMapper: M;

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
            dataSourceName: this.baseMapper.settings.dataSourceName,
            partner: this.baseMapper.settings.partner?.split(","),
            datatype: this.baseMapper.settings.datatype?.split(","),
            provider: this.baseMapper.settings.provider?.split(","),
            iPlugId: this.baseMapper.settings.iPlugId,
            organisation: this.baseMapper.settings.description,
            map_iframe: this.getMapIFrame(250),
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

    isFeatureType(): boolean {
        return this.baseMapper.isFeatureType();
    }

    getFeatureTypeName(): string {
        return this.baseMapper.getTypename();
    }

    getNumberOfFeatures(): number {
        return this.isFeatureType() ? this.baseMapper.getNumberOfFeatures() : null;
    }

    abstract getAdditionalHtml(): string;

    getMapIFrame(height: number): string {
        let mapLink = '';
        let serviceURL = encodeURIComponent(`${this.getMetadataSource().source_base}?SERVICE=WFS&VERSION=${this.baseMapper.settings.version}&`);
        mapLink += '/DE/dienste/ingrid-webmap-client/frontend/prd/embed.html?layers=';
        mapLink += 'WFS%7C%7C' + encodeURIComponent(this.getTitle().replaceAll(',','') + ' (WFS)') + '%7C%7C' + serviceURL + '%7C%7C' + this.getFeatureTypeName();
        mapLink += '%2C';
        let wmsURL = serviceURL.split('%3F')[0];
        mapLink += 'WMS%7C%7C' + encodeURIComponent(this.getTitle().replaceAll(',','') + ' (WMS)') + '%7C%7C' + wmsURL + '%3F%7C%7C' + this.getFeatureTypeName() + '%7C%7C1.3.0%7C%7Ctrue%7C%7Cfalse%7C%7CInformationstechnikzentrum%2520Bund%252C%2520Dienstsitz%2520Ilmenau%7C%7Chttps%3A%2F%2Fwww.kuestendaten.de%2FDE%2Fdynamisch%2Fkuestendaten_ogc%2Fbs%3F';
        return '<iframe src="' + mapLink + '" height="' + height + '" frameborder="0" style="border:0"></iframe>';
    }

    abstract getIdf(idx?: number): string;

    getTitle(): string{
        return this.baseMapper.getTitle();
    }

    abstract getDescription(): string;

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
