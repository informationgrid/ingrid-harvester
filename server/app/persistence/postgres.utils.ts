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

import { DatabaseConfiguration } from '@shared/general-config.settings';
import { Client, Pool, PoolClient, QueryResult } from 'pg';
import { Catalog } from '../model/dcatApPlu.model';
import { Distribution } from '../model/distribution';
import { CouplingEntity, Entity, RecordEntity } from '../model/entity';
import { IndexDocument } from '../model/index.document';
import { Summary } from '../model/summary';
import { DcatApPluDocumentFactory } from '../profiles/diplanung/model/dcatapplu.document.factory';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader';
import * as MiscUtils from '../utils/misc.utils';
import { BulkResponse, DatabaseUtils } from './database.utils';
import { ElasticsearchUtils } from './elastic.utils';
import { PostgresQueries } from './postgres.queries';

const log = require('log4js').getLogger(__filename);
const Cursor = require('pg-cursor');

/**
 * Contains a primary dataset, a list of duplicates, and a list of services operating on the primary dataset.
 */
export interface Bucket<T> {
    anchor_id: string | number,
    duplicates: Map<string | number, T>,
    operatingServices: Map<string | number, Distribution>
}

export class PostgresUtils extends DatabaseUtils {

    private static pool: Pool;
    private queries: PostgresQueries;
    private transactionClient: PoolClient;

    constructor(configuration: DatabaseConfiguration, summary: Summary) {
        super();
        this.configuration = PostgresUtils.fix(configuration);

        if (!PostgresUtils.pool) {
            PostgresUtils.pool = new Pool(configuration);
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
        await this.transactionClient.query(this.queries.createCouplingTable);
        await this.commitTransaction();
    }

    async getStoredData(ids: string[]): Promise<any[]> {
        let result: QueryResult<any> = await PostgresUtils.pool.query(this.queries.getStoredData, [ids]);
        let dates = [];
        for (let row of result.rows) {
            dates.push({
                id: row.extras.generated_id,
                issued: row.extras.metadata.issued,
                modified: row.extras.metadata.modified,
                dataset_modified: row.modified
            });
        }
        return dates;
    }

    async getDatasetIdentifiers(source: string): Promise<string[]> {
        // TODO
        // let result: QueryResult<any> = await PostgresUtils.pool.query(this.queries.getIdentifiers, [source]);
        // let result: QueryResult<any> = await this.transactionClient.query("SELECT * from public.record WHERE source = $1", [source]);
        let result: QueryResult<any> = await this.transactionClient.query("SELECT identifier from public.record WHERE source = $1 and dataset->'extras'->>'hierarchy_level'!='service'", [source]);
        if (result.rowCount == 0) {
            return [];
        }
        return result.rows.map(row => row.identifier);
    }

    client(useTransaction: boolean) {
        return useTransaction ? this.transactionClient : PostgresUtils.pool;
    }

    async getDatasets(source: string | number, useTransaction: boolean = true): Promise<RecordEntity[]> {
        let query = typeof source == "number" ? this.queries.getDatasetsByCollection : this.queries.getDatasetsBySource;
        let result: QueryResult<any> = await this.client(useTransaction).query(query, [source]);
        if (result.rowCount == 0) {
            return null;
        }
        return result.rows;
    }

    async deleteDatasets(catalogId: number): Promise<void> {
        await PostgresUtils.pool.query(this.queries.deleteRecords, [catalogId]);
    }

    async moveDatasets(catalogId: number, targetCatalogId: number): Promise<void> {
        // TODO this results in an error if there is already another dataset with the same identifier,collection_id,source
        // TODO thus, a simple SQL UPDATE does not suffice
        // when a solution is implemented:
        // * the try/catch parentheses can be removed
        // * the [disabled] attribute in the `mat-radio-button` in `delete-catalog.component.html` can be removed
        try {
            await PostgresUtils.pool.query(this.queries.moveRecords, [catalogId, targetCatalogId]);
        }
        catch (e) {
            throw e;
        }
    }

    async getServices(source: string): Promise<RecordEntity[]> {
        let result: QueryResult<any> = await this.transactionClient.query(this.queries.getServices, [source]);
        if (result.rowCount == 0) {
            return null;
        }
        return result.rows;
    }

    async getCatalogSizes(useTransaction: boolean = true): Promise<{ collection_id: number, count: number }[]> {
        let result: QueryResult<any> = await this.client(useTransaction).query(this.queries.getCollectionSizes);
        if (result.rowCount == 0) {
            return null;
        }
        return result.rows.reduce((val, { collection_id, count }) => ({ [collection_id]: count, ...val }), {});
    }

    async listCatalogs(): Promise<Catalog[]> {
        // TODO maybe move this to somewhere more sensible
        await this.init();
        let result: QueryResult<any> = await PostgresUtils.pool.query(this.queries.listCollections);
        if (result.rowCount == 0) {
            return [];
        }
        let catalogs: Catalog[] = result.rows.map(row => ({ id: row.id, ...row.properties }));
        return catalogs.sort((c1, c2) => c1.title < c2.title ? -1 : c1.title > c2.title ? 1 : 0);
    }

    async createCatalog(catalog: Catalog): Promise<Catalog> {
        let result: QueryResult<any> = await PostgresUtils.pool.query(this.queries.createCollection, [catalog.identifier, catalog, null, await DcatApPluDocumentFactory.createCatalog(catalog), catalog]);
        if (result.rowCount != 1) {
            return null;
        }
        catalog.id = result.rows[0].id;
        return catalog;
    }

    async getCatalog(identifier: string): Promise<Catalog> {
        let result: QueryResult<any> = await PostgresUtils.pool.query(this.queries.getCollection, [identifier]);
        if (result.rowCount == 0) {
            return null;
        }
        return {
            id: result.rows[0].id,
            ...result.rows[0].properties
        };
    }

    async updateCatalog(catalog: Catalog): Promise<Catalog> {
        // don't persist ID within catalog json
        delete catalog['id'];
        let result: QueryResult<any> = await PostgresUtils.pool.query(this.queries.updateCollection,
            [catalog.identifier, catalog, null, await DcatApPluDocumentFactory.createCatalog(catalog), catalog]);
        if (result.rowCount != 1) {
            return null;
        }
        catalog.id = result.rows[0].id;
        return catalog;
    }

    async deleteCatalog(catalogId: number): Promise<Catalog> {
        let result: QueryResult<any> = await PostgresUtils.pool.query(this.queries.deleteCollection, [catalogId]);
        if (result.rowCount != 1) {
            return null;
        }
        return null;
    }

    async nonFetchedPercentage(source: string, last_modified: Date): Promise<number> {
        let result: QueryResult<any> = await this.transactionClient.query(this.queries.nonFetchedRatio, [source, last_modified]);
        let { total, nonfetched } = result.rows[0];
        return nonfetched / total * 100;
    }

    async deleteNonFetchedDatasets(source: string, last_modified: Date): Promise<void> {
        await this.transactionClient.query(this.queries.deleteNonFetchedRecords, [source, last_modified]);
    }

    /**
     * Push datasets from database to elasticsearch, slower but with all bells and whistles.
     *
     * @param elastic
     * @param source
     * @param processBucket
     */
    async pushToElastic3ReturnOfTheJedi(elastic: ElasticsearchUtils, source: string) {
        let pgAggregator = ProfileFactoryLoader.get().getPostgresAggregator();
        const client: PoolClient = await PostgresUtils.pool.connect();
        log.debug('Connection started');
        let start = Date.now();
        // TODO we also need to store SOURCE_TYPE in postgres and subsequently fetch it here (B.source_type)
        // @myself: next time, when you want me to do something in the future, specify WHY that should be done...

        let catalogs = (await this.listCatalogs()).reduce((map, catalog: Catalog) => (map[catalog.id] = catalog, map), {});

        const cursor = client.query(new Cursor(this.queries.getBuckets, [source]));
        // const totalRows = client.query(this.queries.getBuckets, [source]);
        let currentId: string | number;
        let currentBucket: Bucket<any>;
        const maxRows = 100;
        let rows = await cursor.read(maxRows);
        let numDatasets = 0;
        let numBuckets = 0;
        while (rows.length > 0) {
            log.info(`PQ->ES: Processing rows ${numDatasets} - ${numDatasets + rows.length}`);
            for (let row of rows) {
                numDatasets += 1;
                if (row.anchor_id != currentId) {
                    numBuckets += 1;
                    // process current bucket, then create new
                    currentId = row.anchor_id;
                    if (currentBucket) {
                        let operationChunks = await pgAggregator.processBucket(currentBucket);
                        await elastic.addOperationChunksToBulk(operationChunks);
                    }
                    currentBucket = {
                        anchor_id: row.anchor_id,
                        duplicates: new Map<string | number, IndexDocument>(),
                        operatingServices: new Map<string | number, Distribution>()
                    };
                }
                // add service distribution to current bucket
                if (row.service_type != null) {
                    currentBucket.operatingServices.set(row.id, row.dataset);
                }
                // add index document to current bucket
                else {
                    // ensure `extras` structure exists in dataset
                    row.dataset.extras ??= {};
                    row.dataset.extras.metadata ??= {};
                    row.dataset.extras.metadata.source ??= {};
                    // set metadata information
                    row.dataset.extras.metadata.issued = row.issued;
                    row.dataset.extras.metadata.modified = row.modified;
                    row.dataset.extras.metadata.deleted = row.deleted;
                    row.dataset.extras.metadata.source.source_type = this.getSourceType(row.dataset, row.source);
                    row.dataset.catalog = catalogs[row.catalog_id];
                    currentBucket.duplicates.set(row.id, row.dataset);
                }
            }
            rows = await cursor.read(maxRows);
        }
        // process last bucket
        if (currentBucket) {
            let operationChunks = await pgAggregator.processBucket(currentBucket);
            await elastic.addOperationChunksToBulk(operationChunks);
        }
        // send remainder of bulk data
        await elastic.sendBulkOperations();
        log.debug('Connection released');
        cursor.close();
        client.release();
        let stop = Date.now();
        log.info(`Processed ${numDatasets} datasets and ${numBuckets} buckets`);
        log.info('Time for PG -> ES push: ' + Math.floor((stop - start)/1000) + 's');
    }

    /**
     * Infer source type from source URL.
     *
     * @param source
     * @returns
     */
    private getSourceType(dataset: IndexDocument, source: string) {
        source = source.toLowerCase()
        if (source.includes('cockpitpro')) {
            return 'cockpitpro';
        }
        if (source.includes('cockpit')) {
            return 'cockpit';
        }
        if (source.includes('beteiligung')) {
            return 'beteiligungsdb';
        }
        if (source.includes('csw')) {
            return 'csw';
        }
        if (source.includes('wfs')) {
            return 'wfs';
        }
        return dataset.extras?.metadata?.source?.source_type ?? source;
    }

    write(entity: RecordEntity) {
        throw new Error('Method not implemented.');
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
        let result: QueryResult<any>;
        try {
            if ((entities[0] as RecordEntity).collection_id) {
                // if we have the same entity twice in the same bulk, merge the entity before persisting
                // this can occur due to the way updates are handled (e.g. in CSW we have to wait for WMS calls to finish)
                // if we don't merge, we get the following error:
                // "Ensure that no rows proposed for insertion within the same command have duplicate constrained values."
                // TODO ideally, we change handling from `Entity` to `Entity.DbOperation`, to only send updates when needed
                // TODO (instead of full upserts) and handle JSON updates within Postgres
                entities = this.mergeRecordEntities(entities as RecordEntity[]);
                // we remove catalogs from the entities at this point because we don't want them to persisted into the
                // dataset in the catalog
                entities = this.removeCatalogs(entities as RecordEntity[]);
                result = await this.transactionClient.query(this.queries.bulkUpsert, [JSON.stringify(entities, MiscUtils.dateReplacer)]);
            }
            else if ((entities[0] as CouplingEntity).service_id) {
                entities = this.mergeCouplingEntities(entities as CouplingEntity[]);
                result = await this.transactionClient.query(this.queries.bulkUpsertCoupling, [JSON.stringify(entities, MiscUtils.dateReplacer)]);
            }
            else {
                throw new Error('Unrecognised Entity type');
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

    private mergeRecordEntities(entities: RecordEntity[]): RecordEntity[] {
        let entityMap: Map<string, RecordEntity> = new Map();
        entities.forEach(entity => {
            let uid = entity.identifier + '/' + entity.collection_id;
            if (!entityMap[uid]) {
                entityMap[uid] = entity;
            }
            else {
                if (entity.dataset.extras.metadata.modified > entityMap[uid].dataset.extras.metadata.modified) {
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

    private removeCatalogs(entities: RecordEntity[]): RecordEntity[] {
        for (let entity of entities) {
            if ('catalog' in entity.dataset) {
                entity.dataset.catalog = { id: entity.collection_id };
            }
            // delete entity.dataset.catalog;
        }
        return entities;
    }

    async addEntityToBulk(entity: Entity): Promise<BulkResponse> {
        if ((entity as RecordEntity).collection_id) {
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

    sendBulkData(commitTransaction: boolean = false): Promise<BulkResponse> {
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

    sendBulkCouples(commitTransaction: boolean = false): Promise<BulkResponse> {
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
            let client: Client;
            try {
                client = new Client(PostgresUtils.fix(configuration));
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
        let result: QueryResult<any> = await this.transactionClient.query("SELECT transaction_timestamp()");
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
        this.summary.databaseErrors?.push(message);
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
