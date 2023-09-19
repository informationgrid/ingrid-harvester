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
import { DcatApPluDocument } from '../profiles/diplanung/model/dcatApPlu.document';
import { DiplanungIndexDocument } from '../profiles/diplanung/model/index.document';
import { ElasticsearchUtils, EsOperation } from './elastic.utils';
import { Entity } from '../model/entity';
import { Organization, Person } from '../model/agent';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader';
import { Summary } from '../model/summary';

const log = require('log4js').getLogger(__filename);
const Cursor = require('pg-cursor');
// const QueryStream = require('pg-query-stream');
// const TransformToBulk = require('elasticsearch-streams').TransformToBulk;
// const WritableBulk = require('elasticsearch-streams').WritableBulk;

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
    private transactionClient: PoolClient;

    constructor(configuration: DatabaseConfiguration, summary: Summary) {
        super();
        this.configuration = configuration;

        if (!PostgresUtils.pool) {
            PostgresUtils.pool = new Pool(configuration);
        }

        this._bulkData = [];
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
        await PostgresUtils.pool.query(this.queries.createCollectionTable);
        await PostgresUtils.pool.query(this.queries.createDatasetTable);
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
        let result: QueryResult<any> = await PostgresUtils.pool.query(this.queries.createCatalog, [catalog.identifier, catalog, null, DcatApPluDocument.createCatalog(catalog), catalog]);
        if (result.rowCount != 1) {
            return null;
        }
        catalog.id = result.rows[0].id;
        return catalog;
    }

    async getCatalog(identifier: string): Promise<Catalog> {
        let result: QueryResult<any> = await PostgresUtils.pool.query(this.queries.getCatalog, [identifier]);
        if (result.rowCount == 0) {
            return null;
        }
        return { 
            id: result.rows[0].id,
            ...result.rows[0].properties
        };
    }

    /**
     * Push datasets from database to elasticsearch, slower but with all bells and whistles.
     * 
     * @param elastic 
     * @param source 
     * @param processBucket
     */
    async pushToElastic3ReturnOfTheJedi(elastic: ElasticsearchUtils, source: string, processBucket: (bucket: Bucket) => Promise<EsOperation[]>) {
        const client: PoolClient = await PostgresUtils.pool.connect();
        log.debug('Connection started');
        // TODO we also need to store SOURCE_TYPE in postgres and subsequently fetch it here (B.source_type)
        let q = this.queries.getBuckets(source);
        console.log(q);
        // const query = new QueryStream(q);
        // const stream = client.query(query);
        const cursor = client.query(new Cursor(q));
        let currentId: string | number;
        let currentBucket: Bucket;
        const maxRows = 100;
        let rows = await cursor.read(maxRows);
        while (rows.length > 0) {
            for (let row of rows) {
                if (row.anchor_id != currentId) {
                    // process current bucket, then create new
                    currentId = row.anchor_id;
                    if (currentBucket) {
                        let operationChunks = await processBucket(currentBucket);
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
            let operationChunks = await processBucket(currentBucket);
            elastic.addOperationChunksToBulk(operationChunks);
        }
        // send remainder of bulk data
        elastic.sendBulkOperations(true);
        log.debug('Connection released');
        client.release();
    }

    write(entity: Entity) {
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
            result = await this.transactionClient.query(this.queries.bulkUpsert, [JSON.stringify(entities)]);
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

    addEntityToBulk(entity: Entity): Promise<BulkResponse> {
        this._bulkData.push(entity);

        // this.deduplicationUtils._queueForDuplicateSearch(doc, id);

        // send data to elasticsearch if limit is reached
        if (this._bulkData.length >= DatabaseUtils.maxBulkSize) {
            return this.sendBulkData();
        }
        else {
            return new Promise(resolve => resolve({
                queued: true
            }));
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

    async query(text: string, params: any[]) {
        // return await this.pool.query(text, params);
        return null;
    }

    static async ping(configuration: DatabaseConfiguration): Promise<boolean> {
        let client: Client;
        try {
            client = new Client(configuration);
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
}
