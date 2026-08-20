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
import log4js from 'log4js';
import pg from 'pg';
import Cursor from "pg-cursor";
import type { Observer } from "rxjs";
import type { CatalogColumnType } from '../catalog/catalog.factory.js';
import type { Distribution } from '../model/distribution.js';
import type { CouplingEntity, Entity, RecordEntity } from '../model/entity.js';
import type { ImportLogMessage } from '../model/import.result.js';
import type { IndexDocument } from '../model/index.document.js';
import type { Summary } from '../model/summary.js';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader.js';
import type { BulkResponse } from './database.utils.js';
import { DatabaseUtils } from './database.utils.js';
import type { PostgresQueries } from './postgres.queries.js';

const log = log4js.getLogger(import.meta.filename);

/**
 * Contains a primary dataset, a list of duplicates, and a list of services operating on the primary dataset.
 */
export interface Bucket<T> {
    anchor_id: string | number,
    duplicates: Map<string | number, BucketDocument<T>>,
    operatingServices: Map<string | number, Distribution>
}

/**
 * A document within a bucket, carrying the per-record metadata (DB columns)
 * alongside the document instead of inside it.
 */
export interface BucketDocument<T> {
    document: T,
    issued?: Date,
    modified?: Date,
    deleted?: Date,
}

export class PostgresUtils extends DatabaseUtils {

    private static pool: pg.Pool;
    private queries: PostgresQueries;
    private transactionClient: pg.PoolClient;

    constructor(configuration: DatabaseConfiguration, summary: Summary) {
        super();
        this.configuration = PostgresUtils.fix(configuration);

        if (!PostgresUtils.pool) {
            PostgresUtils.pool = new pg.Pool({
                ...this.configuration,
                idleTimeoutMillis: 300000 // 5min
            });
        }

        this._bulkData = [];
        this._bulkCouples = [];
        this.queries = ProfileFactoryLoader.get().getPostgresQueries();
        this.summary = summary;
    }

    async init(): Promise<void> {
        await this.createTables();
    }

    async createTables() {
        await this.beginTransaction();
        await this.transactionClient.query(this.queries.createCollectionTable);
        await this.transactionClient.query(this.queries.createRecordTable);
        // migration for existing installations created before the column was introduced
        await this.transactionClient.query('ALTER TABLE public.record ADD COLUMN IF NOT EXISTS harvest_metadata JSONB');
        await this.transactionClient.query(this.queries.createCouplingTable);
        await this.commitTransaction();
    }

    async getDatasetIdentifiers(source: string): Promise<string[]> {
        let result: pg.QueryResult<any> = await PostgresUtils.pool.query(this.queries.getDatasetIdentifiers, [source]);
        if (result.rowCount == 0) {
            return [];
        }
        return result.rows.map(row => row.identifier);
    }

    client(useTransaction: boolean) {
        return useTransaction ? this.transactionClient : PostgresUtils.pool;
    }

    async getDatasets(source: string | number, useTransaction: boolean = true): Promise<RecordEntity[]> {
        let result: pg.QueryResult<any> = await this.client(useTransaction).query(this.queries.getDatasetsBySource, [source]);
        if (result.rowCount == 0) {
            return null;
        }
        return result.rows;
    }

    // async getDcatapdeDatasetsBySource(source: string): Promise<Pick<RecordEntity, 'id' | 'identifier' | 'dataset_dcatapde'>[]> {
    //     let result: pg.QueryResult<any> = await PostgresUtils.pool.query(this.queries.getDcatapdeDatasetsBySource, [source]);
    //     if (result.rowCount == 0) {
    //         return [];
    //     }
    //     return result.rows;
    // }

    async getIdentifiersByCatalog(catalog_id: number): Promise<string[]> {
        let result: pg.QueryResult<any> = await PostgresUtils.pool.query(this.queries.getIdentifiersByCatalog, [catalog_id]);
        if (result.rowCount == 0) {
            return [];
        }
        return result.rows.map(row => row.identifier);
    }

    async getServices(source: string): Promise<RecordEntity[]> {
        let result: pg.QueryResult<any> = await this.transactionClient.query(this.queries.getServices, [source]);
        if (result.rowCount == 0) {
            return null;
        }
        return result.rows;
    }

    async nonFetchedPercentage(source: string, last_modified: Date): Promise<number> {
        let result: pg.QueryResult<any> = await this.transactionClient.query(this.queries.nonFetchedRatio, [source, last_modified]);
        let { total, nonfetched } = result.rows[0];
        return nonfetched / total * 100;
    }

    async deleteNonFetchedDatasets(source: string, last_modified: Date): Promise<void> {
        await this.transactionClient.query(this.queries.deleteNonFetchedRecords, [source, last_modified]);
    }

    async deleteCatalogDatasets(catalogId: number): Promise<void> {
        await this.transactionClient.query(
            'DELETE FROM record WHERE catalog_ids = ARRAY[$1]',
            [catalogId]
        );
        await this.transactionClient.query(
            'UPDATE record SET catalog_ids = array_remove(catalog_ids, $1) WHERE catalog_ids @> ARRAY[$1]',
            [catalogId]
        );
    }

    /**
     * Stream datasets from the database to a given catalog,
     * while observing catalog-specific transformation and deduplication rules.
     *
     * @param source
     * @param observer
     */
    async *streamBuckets<T extends CatalogColumnType>(source: string, datasetColumn: string, observer: Observer<ImportLogMessage>, summary: Summary, query: string = this.queries.getBuckets): AsyncGenerator<Bucket<T>> {
        const client: pg.PoolClient = await PostgresUtils.pool.connect();
        log.debug('Connection started');
        const startDate = Date.now();

        query = query.replaceAll('{{DATASET_COLUMN}}', datasetColumn);

        // get total rows before creating the cursor
        const { rows: [{ count: totalRows }] } = await client.query(
            `SELECT COUNT(*)::int AS count FROM (${query}) AS t`,
            [source]
        );

        const cursor = client.query(new Cursor(query, [source]));
        let currentId: string | number;
        let currentBucket: Bucket<T>;
        const maxRows = 100;
        let rows = await cursor.read(maxRows);
        let numDatasets = 0;
        let numBuckets = 0;
        while (rows.length > 0) {
            log.info(`PQ->ES: Processing rows ${numDatasets} - ${numDatasets + rows.length}`);
            observer.next(summary.msgRunning(numDatasets, totalRows, 'Datensätze werden verarbeitet'));
            for (let row of rows) {
                numDatasets += 1;
                if (row.anchor_id != currentId) {
                    numBuckets += 1;
                    // send current bucket, then create new
                    currentId = row.anchor_id;
                    if (currentBucket) {
                        yield currentBucket;
                    }
                    currentBucket = {
                        anchor_id: row.anchor_id,
                        duplicates: new Map<string | number, BucketDocument<T>>(),
                        operatingServices: new Map<string | number, Distribution>()
                    };
                }
                if (datasetColumn != 'dataset') {
                    currentBucket.duplicates.set(row.id, {
                        document: { uuid: row.identifier, dataset: row.dataset, modified: row.modified } as any,
                        modified: row.modified,
                        deleted: row.deleted,
                    });
                }
                else {
                    // add service/additional distribution to current bucket
                    if (row.service_type != null) {
                        currentBucket.operatingServices.set(row.id, row.dataset);
                    }
                    // add index document to current bucket
                    else {
                        currentBucket.duplicates.set(row.id, {
                            document: row.dataset,
                            issued: row.issued,
                            modified: row.modified,
                            deleted: row.deleted,
                        });
                    }
                }
            }
            rows = await cursor.read(maxRows);
        }
        // send last bucket
        if (currentBucket) {
            yield currentBucket;
        }
        log.debug('Connection released');
        cursor.close();
        client.release();
        const stopDate = Date.now();
        log.info(`Processed ${numDatasets} datasets and ${numBuckets} buckets`);
        log.info(`Time for PG -> ES push: ${Math.floor((stopDate - startDate)/1000)}s`);
    }

    /**
     * Execute a bulk upsert into the PSQL database
     *
     * @param entities the entities to persist (via upsert)
     * @returns BulkResponse containing number of affected rows
     */
    async bulk(entities: Entity[], commitTransaction: boolean): Promise<BulkResponse> {
        if (!this.transactionClient) {
            this.handleError('Error during bulk transactional persistance:', 'no open transaction; not persisting to DB');
            return null;
        }
        let result: pg.QueryResult<any>;
        try {
            if (entities.length == 0) {
                result = { rowCount: 0 } as pg.QueryResult;
            }
            else if (PostgresUtils.isRecordEntities(entities)) {
                // if we have the same entity twice in the same bulk, merge the entity before persisting
                // this can occur due to the way updates are handled (e.g. in CSW we have to wait for WMS calls to finish)
                // if we don't merge, we get the following error:
                // "Ensure that no rows proposed for insertion within the same command have duplicate constrained values."
                // TODO ideally, we change handling from `Entity` to `Entity.DbOperation`, to only send updates when needed
                // TODO (instead of full upserts) and handle JSON updates within Postgres
                const mergedEntities = this.mergeRecordEntities(entities);
                // we remove catalogs from the entities at this point because we don't want them to persisted into the
                // dataset in the catalog
                result = await this.transactionClient.query(this.queries.bulkUpsert, [JSON.stringify(mergedEntities, ProfileFactoryLoader.get().dateReplacer)]);
            }
            else if (PostgresUtils.isCouplingEntities(entities)) {
                const mergedEntities = this.mergeCouplingEntities(entities);
                result = await this.transactionClient.query(this.queries.bulkUpsertCoupling, [JSON.stringify(mergedEntities, ProfileFactoryLoader.get().dateReplacer)]);
            }
            else {
                throw new Error('Unrecognized Entity type');
            }
            log.debug('Bulk finished of data #items: ' + entities.length);
        }
        catch (e) {
            this.handleError('Error during bulk persisting of #items: ' + entities.length, e);
            await this.rollbackTransaction();
        }
        return new Promise(resolve => resolve({
            queued: false,
            response: result?.rowCount
        }));
    }

    private static isRecordEntities(entities: Entity[]): entities is RecordEntity[] {
        return (entities[0] as RecordEntity).catalog_ids != null;
    }

    private static isCouplingEntities(entities: Entity[]): entities is CouplingEntity[] {
        return (entities[0] as CouplingEntity).service_id != null;
    }

    // DiplanungIndexDocument carries `modified` as a top-level Date, while IndexDocument (used by
    // every other profile) carries it as an ISO string under `metadata.modified` - normalize both
    // to a Date so they can be compared regardless of which shape `dataset` is.
    private static getDatasetModified(dataset: RecordEntity['dataset']): Date {
        const modified = 'metadata' in dataset ? dataset.metadata?.modified : dataset.modified;
        return modified ? new Date(modified) : undefined;
    }

    private mergeRecordEntities(entities: RecordEntity[]): RecordEntity[] {
        let entityMap: Map<string, RecordEntity> = new Map();
        entities.forEach(entity => {
            // let uid = entity.identifier + '/' + entity.collection_id;
            let uid = entity.identifier;
            if (!entityMap[uid]) {
                entityMap[uid] = entity;
            }
            else {
                if (PostgresUtils.getDatasetModified(entity.dataset) > PostgresUtils.getDatasetModified(entityMap[uid].dataset)) {
                    entityMap[uid].dataset = entity.dataset;
                }
                else {
                    entityMap[uid] = { ...entity, dataset: entityMap[uid].dataset };
                }
            }
        });
        return Object.values(entityMap);
    }

    private mergeCouplingEntities(entities: CouplingEntity[]): CouplingEntity[] {
        let entityMap: Map<string, CouplingEntity> = new Map();
        entities.forEach(entity => {
            let uid = entity.dataset_identifier + '/' + entity.service_id + '/' + entity.service_type;
            if (!entityMap[uid] || entity.distribution.title?.length > entityMap[uid].distribution.title?.length) {
                entityMap[uid] = entity;
            }
        });
        return Object.values(entityMap);
    }

    async addEntityToBulk(entity: Entity): Promise<BulkResponse> {
        if ((entity as RecordEntity).catalog_ids) {
            this._bulkData.push(entity as RecordEntity);
            // send data to database if limit is reached
            if (this._bulkData.length >= DatabaseUtils.maxBulkSize) {
                return this.sendBulkData();
            }
            else {
                return new Promise(resolve => resolve({
                    queued: true
                }));
            }
        }
        else if ((entity as CouplingEntity).service_id) {
            this._bulkCouples.push(entity as CouplingEntity);
            // send data to database if limit is reached
            if (this._bulkCouples.length >= DatabaseUtils.maxBulkSize) {
                return this.sendBulkCouples();
            }
            else {
                return new Promise(resolve => resolve({
                    queued: true
                }));
            }
        }
        else {
            throw new Error('Unrecognized Entity type');
        }
    }

    async sendBulkData(commitTransaction: boolean = false): Promise<BulkResponse> {
        if (this._bulkData.length > 0) {
            log.debug('Sending BULK message with ' + this._bulkData.length + ' items to persist');
            let promise = this.bulk(this._bulkData, commitTransaction);
            this._bulkData = [];
            return promise;
        }
        return new Promise(resolve => resolve({
            queued: true
        }));
    }

    async sendBulkCouples(commitTransaction: boolean = false): Promise<BulkResponse> {
        if (this._bulkCouples.length > 0) {
            log.debug('Sending BULK message with ' + this._bulkCouples.length + ' items to persist');
            let promise = this.bulk(this._bulkCouples, commitTransaction);
            this._bulkCouples = [];
            return promise;
        }
        return new Promise(resolve => resolve({
            queued: true
        }));
    }

    async query(text: string, params: any[]) {
        // return await this.pool.query(text, params);
        return null;
    }

    async ping() {
        try {
            const result = await PostgresUtils.pool.query('SELECT * FROM record LIMIT 1');
            return !!result;
        }
        catch (e) {
            return false;
        }
    }

    static async ping(configuration?: DatabaseConfiguration): Promise<boolean> {
        if (configuration) {
            let client: pg.Client;
            try {
                client = new pg.Client(PostgresUtils.fix(configuration));
                await client.connect();
            }
            catch (e) {
                return false;
            }
            finally {
                await client?.end();
            }
            return true;
        }
        try {
            const result = await PostgresUtils.pool.query('SELECT * FROM record LIMIT 1');
            return !!result;
        }
        catch (e) {
            return false;
        }
    }

    async beginTransaction(): Promise<Date> {
        log.debug('Transaction: begin');
        this.transactionClient = await PostgresUtils.pool.connect();
        await this.transactionClient.query('BEGIN');
        let result: pg.QueryResult<any> = await this.transactionClient.query("SELECT transaction_timestamp()");
        if (result.rowCount != 1) {
            throw new Error('Could not obtain transaction_timestamp from PostgreSQL');
        }
        let timestamp: Date = result.rows[0].transaction_timestamp;
        return timestamp;
    }

    async commitTransaction() {
        if (this.transactionClient) {
            log.debug('Transaction: commit');
            await this.transactionClient.query('COMMIT');
            this.transactionClient.release();
            this.transactionClient = null;
        }
        else {
            log.warn('Cannot commit transaction: no open transaction found')
        }
    }

    async rollbackTransaction() {
        if (this.transactionClient) {
            log.error('Transaction: rollback');
            await this.transactionClient.query('ROLLBACK');
            this.transactionClient.release();
            this.transactionClient = null;
        }
        else {
            log.warn('Cannot rollback transaction: no open transaction found')
        }
    }

    private handleError(message: string, error: any) {
        this.summary.errors.push({ type: 'database', error: message });
        log.error(message, error);
    }

    private static fix(config: DatabaseConfiguration) {
        if (config.connectionString) {
            let url = new URL(config.connectionString);
            // add credentials to connection string
            if (config.user && !url.username) {
                url.username = config.user;
            }
            if (config.password && !url.password) {
                url.password = config.password;
            }
            // node-pg has a quirk where it passes sslmode=require as { ssl: true } to node-tls,
            // which in turn checks hostname and certificate (which sslmode=require should NOT do).
            // re-create the intended behaviour here
            if (url.searchParams.get('sslmode') == 'require') {
                url.searchParams.delete('sslmode');
                config.ssl = {
                    rejectUnauthorized: false
                };
            }
            config.connectionString = url.toString();
        }
        return config;
    }
}
