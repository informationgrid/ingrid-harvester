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

import type { DatabaseConfiguration } from '@shared/general-config.settings.js';
import type { Observer } from "rxjs";
import type { CatalogColumnType } from '../catalog/catalog.factory.js';
import type { CouplingEntity, Entity, RecordEntity } from '../model/entity.js';
import type { ImportLogMessage } from "../model/import.result.js";
import type { Summary } from '../model/summary.js';
import type { Bucket } from './postgres.utils.js';

export interface BulkResponse {
    queued: boolean;
    response?: any;
}

export abstract class DatabaseUtils {

    public static maxBulkSize: number = 50;
    protected configuration: DatabaseConfiguration;
    protected summary: Summary;

    public _bulkData: RecordEntity[];
    public _bulkCouples: CouplingEntity[];

    abstract init(): Promise<void>;

    abstract bulk(entities: RecordEntity[], commitTransaction: boolean): Promise<BulkResponse>;

    /**
     * Add an entity to the bulk array which will be sent to the database
     * if a certain limit {{maxBulkSize}} is reached.
     *
     * @param entity
     * @param {number} maxBulkSize
     */
    abstract addEntityToBulk(entity: Entity): Promise<BulkResponse>;

    /**
     * Send all collected bulk data if any.
     */
    abstract sendBulkData(): Promise<BulkResponse>;

    abstract sendBulkCouples(): Promise<BulkResponse>;

    abstract beginTransaction(): Promise<Date>;

    abstract commitTransaction(): Promise<void>;

    abstract rollbackTransaction(): Promise<void>;

    abstract nonFetchedPercentage(source: string, last_modified: Date): Promise<number>;

    abstract deleteNonFetchedDatasets(source: string, last_modified: Date): Promise<void>;

    abstract streamBuckets<T extends CatalogColumnType>(source: string, datasetColumn: string, observer: Observer<ImportLogMessage>): AsyncGenerator<Bucket<T>>;

    abstract getStoredData(ids: string[]): Promise<any[]>;

    abstract getDatasetIdentifiers(source: string): Promise<string[]>;

    /**
     * Retrieve all datasets for a specified source.
     */
    abstract getDatasets(source: string, useTransaction?: boolean): Promise<RecordEntity[]>;

    // abstract getDatasetsWithOriginalDocument(source: string): Promise<Pick<RecordEntity, 'id' | 'identifier' | 'original_document'>[]>;

    // abstract getDcatapdeDatasetsBySource(source: string): Promise<Pick<RecordEntity, 'id' | 'identifier' | 'dataset_dcatapde'>[]>;

    abstract getIdentifiersByCatalog(catalog_id: number): Promise<string[]>

    abstract getServices(source: string): Promise<RecordEntity[]>;

    abstract ping(): Promise<boolean>;
}
