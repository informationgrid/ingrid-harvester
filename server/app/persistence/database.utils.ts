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
import type { Catalog } from '../model/dcatApPlu.model.js';
import type { CouplingEntity, Entity, RecordEntity } from '../model/entity.js';
import type { IndexDocument } from '../model/index.document.js';
import type { Summary } from '../model/summary.js';
import type { ElasticsearchUtils } from './elastic.utils.js';
import type { PostgresAggregator } from './postgres.aggregator.js';

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

    abstract write(entity: RecordEntity);

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

    // abstract pushToElastic(elastic: ElasticsearchUtils, source: string): Promise<void>;

    // abstract pushToElastic2ElectricBoogaloo(elastic: ElasticsearchUtils, source: string): Promise<void>;

    abstract nonFetchedPercentage(source: string, last_modified: Date): Promise<number>;

    abstract deleteNonFetchedDatasets(source: string, last_modified: Date): Promise<void>;

    abstract pushToElastic3ReturnOfTheJedi(elastic: ElasticsearchUtils, source: string, aggregator?: PostgresAggregator<IndexDocument>): Promise<void>;

    abstract getStoredData(ids: string[]): Promise<any[]>;

    abstract getDatasetIdentifiers(source: string): Promise<string[]>;

    /**
     * Retrieve all datasets pertaining to either a specified source or a specified collection (id)
     * @param source if a string, search as a source - if a number, search as a collection
     */
    abstract getDatasets(source: string | number, useTransaction?: boolean): Promise<RecordEntity[]>;

    abstract getDatasetsWithOriginalDocument(source: string): Promise<Pick<RecordEntity, 'id' | 'identifier' | 'original_document'>[]>;

    abstract deleteDatasets(catalogId: number): Promise<void>;

    abstract moveDatasets(catalogId: number, targetCatalogId: number): Promise<void>;

    abstract getServices(source: string): Promise<RecordEntity[]>;

    abstract getCatalogSizes(useTransaction: boolean): Promise<any[]>;

    abstract listCatalogs(): Promise<Catalog[]>;

    abstract createCatalog(catalog: Catalog): Promise<Catalog>;

    abstract getCatalog(catalogIdentifier: string): Promise<Catalog>;

    abstract updateCatalog(catalog: Catalog): Promise<Catalog>;

    abstract deleteCatalog(catalogId: number): Promise<Catalog>;

    abstract ping(): Promise<boolean>;

    static ping(configuration?: Partial<DatabaseConfiguration>): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
}
