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

import { BulkResponse, DatabaseUtils } from './database.utils';
import { Catalog } from '../model/dcatApPlu.model';
import { Client, Pool, PoolClient, QueryResult } from 'pg';
import { DatabaseConfiguration } from '@shared/general-config.settings';
import { DcatApPluDocumentFactory } from '../profiles/diplanung/model/dcatapplu.document.factory';
import { DiplanungIndexDocument } from '../profiles/diplanung/model/index.document';
import { PostgresUtils as DiplanungPostgresUtils } from '../profiles/diplanung/persistence/postgres.utils';
import { ElasticsearchUtils } from './elastic.utils';
import { CouplingEntity, Entity, RecordEntity } from '../model/entity';
import { PostgresQueries } from './postgres.queries';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader';
import { Summary } from '../model/summary';

const log = require('log4js').getLogger(__filename);
const Cursor = require('pg-cursor');

/**
 * Contains a primary dataset, a list of duplicates, and a list of services operating on the primary dataset.
 */
export interface Bucket {
    anchor_id: string | number,
    duplicates: Map<string | number, DiplanungIndexDocument>,
    operatingServices: Map<string | number, DiplanungIndexDocument>
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
        this.defaultCatalog = await this.getCatalog(this.configuration.defaultCatalogIdentifier);
        if (!this.defaultCatalog) {
            let catalog: Catalog = {
                description: 'Globaler Katalog',
                identifier: this.configuration.defaultCatalogIdentifier,
                publisher: {
                    name: ''
                },
                title: 'Globaler Katalog'
            };
            this.defaultCatalog = await this.createCatalog(catalog);
        }
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

    async createCatalog(catalog: Catalog): Promise<Catalog> {
        let result: QueryResult<any> = await PostgresUtils.pool.query(this.queries.createCollection, [catalog.identifier, catalog, null, DcatApPluDocumentFactory.createCatalog(catalog), catalog]);
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

    async getCatalogs(): Promise<any[]> {
        let result: QueryResult<any> = await PostgresUtils.pool.query('SELECT * FROM public.collection');
        if (result.rowCount == 0) {
            return [];
        }
        let catalogs: any[] = result.rows.map(row => ({ id: row.id, ...row.properties }));
        return catalogs;
    }

    /**
     * Push datasets from database to elasticsearch, slower but with all bells and whistles.
     * 
     * @param elastic 
     * @param source 
     * @param processBucket
     */
    async pushToElastic3ReturnOfTheJedi(elastic: ElasticsearchUtils, source: string) {
        let pgUtils = new DiplanungPostgresUtils();
        const client: PoolClient = await PostgresUtils.pool.connect();
        log.debug('Connection started');
        let start = Date.now();
        // TODO we also need to store SOURCE_TYPE in postgres and subsequently fetch it here (B.source_type)
        // @myself: next time, when you want me to do something in the future, specify WHY that should be done...

        let catalogs = (await this.getCatalogs()).reduce((map, catalog: Catalog) => (map[catalog.id] = catalog, map), {});

        const cursor = client.query(new Cursor(this.queries.getBuckets, [source]));
        let currentId: string | number;
        let currentBucket: Bucket;
        const maxRows = 100;
        let rows = await cursor.read(maxRows);
        let numDatasets = 0;
        let numBuckets = 0;
        while (rows.length > 0) {
            for (let row of rows) {
                numDatasets += 1;
                if (row.anchor_id != currentId) {
                    numBuckets += 1;
                    // process current bucket, then create new
                    currentId = row.anchor_id;
                    if (currentBucket) {
                        let operationChunks = await pgUtils.processBucket(currentBucket);
                        await elastic.addOperationChunksToBulk(operationChunks);
                    }
                    currentBucket = {
                        anchor_id: row.anchor_id,
                        duplicates: new Map<string | number, DiplanungIndexDocument>(),
                        operatingServices: new Map<string | number, DiplanungIndexDocument>()
                    };
                }
                row.dataset.extras.metadata.issued = row.issued;
                row.dataset.extras.metadata.modified = row.modified;
                row.dataset.extras.metadata.source.source_type = this.getSourceType(row.source);
                row.dataset.catalog = catalogs[row.catalog_id];
                // add to current bucket
                if (row.is_service) {
                    currentBucket.operatingServices.set(row.id, row.dataset);
                }
                else {
                    currentBucket.duplicates.set(row.id, row.dataset);
                }
            }
            rows = await cursor.read(maxRows);
        }
        // process last bucket
        if (currentBucket) {
            let operationChunks = await pgUtils.processBucket(currentBucket);
            elastic.addOperationChunksToBulk(operationChunks);
        }
        // send remainder of bulk data
        elastic.sendBulkOperations(true);
        log.debug('Connection released');
        client.release();
        let stop = Date.now();
        log.info(`Processed ${numDatasets} datasets and ${numBuckets} buckets`);
        log.info('Time for PG -> ES push: ' + Math.floor((stop - start)/1000) + 's');
    }

    private getSourceType(source: string) {
        if (source.includes('beteiligung')) {
            return 'beteiligungsdb';
        }
        if (source.endsWith('csw')) {
            return 'csw';
        }
        if (source.includes('wfs')) {
            return 'wfs';
        }
        return source;
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
                entities = this.mergeEntities(entities as RecordEntity[]);
                // we remove catalogs from the entities at this point because we don't want them to persisted into the
                // dataset in the catalog
                entities = this.removeCatalogs(entities as RecordEntity[]);
                result = await this.transactionClient.query(this.queries.bulkUpsert, [JSON.stringify(entities)]);
            }
            else if ((entities[0] as CouplingEntity).service_id) {
                result = await this.transactionClient.query(this.queries.bulkUpsertCoupling, [JSON.stringify(entities)]);
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

    private mergeEntities(entities: RecordEntity[]): RecordEntity[] {
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

    private removeCatalogs(entities: RecordEntity[]): RecordEntity[] {
        for (let entity of entities) {
            delete entity.dataset.catalog;
        }
        return entities;
    }

    addEntityToBulk(entity: Entity): Promise<BulkResponse> {
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

    static async ping(configuration: DatabaseConfiguration): Promise<boolean> {
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

    async beginTransaction() {
        log.debug('Transaction: begin');
        this.transactionClient = await PostgresUtils.pool.connect();
        await this.transactionClient.query('BEGIN');
    }

    async commitTransaction() {
        log.debug('Transaction: commit');
        await this.transactionClient.query('COMMIT');
        this.transactionClient.release();
        this.transactionClient = null;
    }

    async rollbackTransaction() {
        log.error('Transaction: rollback');
        await this.transactionClient.query('ROLLBACK');
        this.transactionClient.release();
        this.transactionClient = null;
    }

    private handleError(message: string, error: any) {
        this.summary.databaseErrors?.push(message);
        log.error(message, error);
    }

    private static fix(config: DatabaseConfiguration) {
        let cs = config.connectionString;
        if (cs && !cs.includes('@')) {
            config.connectionString = cs.replace('://', `://${config.user}:${config.password}@`);
        }
        return config;
    }
}
