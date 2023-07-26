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
import { Client, Pool, PoolClient, QueryResult } from 'pg';
import { DatabaseConfiguration } from '@shared/general-config.settings';
import { DeduplicateUtils } from './deduplicate.utils';
import { ElasticsearchUtils } from './elastic.utils';
import { Entity } from '../model/entity';
import { PostgresQueries } from './postgres.queries';
import { Summary } from '../model/summary';

const log = require('log4js').getLogger(__filename);
const QueryStream = require('pg-query-stream');
const TransformToBulk = require('elasticsearch-streams').TransformToBulk;
const WritableBulk = require('elasticsearch-streams').WritableBulk;

export class PostgresUtils extends DatabaseUtils {

    static pool: Pool;

    private transactionClient: PoolClient;

    // private transactionStatus: 'open' | 'closed' | 'rolledback';

    constructor(configuration: DatabaseConfiguration, summary: Summary) {
        super();
        // let databaseConfiguration = ConfigService.getGeneralSettings().database;

        // const cn = {
        //     host: 'localhost',
        //     port: 5433,
        //     database: 'my-database-name',
        //     user: 'user-name',
        //     password: 'user-password',
        //     max: 30 // use up to 30 connections
        
        //     // "types" - in case you want to set custom type parsers on the pool level
        // };
        if (!PostgresUtils.pool) {
            PostgresUtils.pool = new Pool(configuration);
        }

        this._bulkData = [];
        this.summary = summary;
        // this.transactionStatus = 'closed';
        this.createTables();
    }

    // preparedQuery(client: PoolClient, name: string, ...values: any[]) {
    //     client.query()
    // }

    async createTables() {
        await PostgresUtils.pool.query(PostgresQueries.createTable);
    }

    async pushToElastic(elastic: ElasticsearchUtils, source: string) {

        const bulkExec = (bulkCmds, callback) => {
            // console.log('Before ' + JSON.stringify(bulkCmds));
            bulkCmds = bulkCmds.map(body => body[PostgresQueries.tableName] ?? body);
            // console.log('After ' + JSON.stringify(bulkCmds));
            elastic.bulk(bulkCmds, false);
        };

        const toBulk = new TransformToBulk(function getIndexTypeId(doc) { return { '_id': doc.dataset.identifier }; });

        const client: PoolClient = await PostgresUtils.pool.connect();
        log.debug('Connection started');
        const queryStream = new QueryStream(PostgresQueries.readDatasets + (source ? ` WHERE source = '${source}'` : ''));
        const stream = client.query(queryStream);
        stream.pipe(toBulk).pipe(new WritableBulk(bulkExec));
        stream.on('end', () => {
            log.debug('Connection released');
            client.release();
        });
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
            result = await this.transactionClient.query(PostgresQueries.bulkUpsert, [JSON.stringify(entities)]);
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

    addEntityToBulk(entity: Entity, maxBulkSize=DatabaseUtils.maxBulkSize): Promise<BulkResponse> {
        this._bulkData.push(entity);

        // this.deduplicationUtils._queueForDuplicateSearch(doc, id);

        // send data to elasticsearch if limit is reached
        if (this._bulkData.length >= maxBulkSize) {
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
