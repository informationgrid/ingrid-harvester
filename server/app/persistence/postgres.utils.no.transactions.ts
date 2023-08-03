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

import { Bucket } from './postgres.utils';
import { BulkResponse, DatabaseUtils } from './database.utils';
import { Client } from 'pg';
import { DatabaseConfiguration } from '@shared/general-config.settings';
import { ElasticsearchUtils, EsOperation } from './elastic.utils';
import { Entity } from '../model/entity';
import { IClient } from 'pg-promise/typescript/pg-subset';
import { IDatabase, IMain, QueryColumns } from 'pg-promise';
import { PostgresQueries } from './postgres.queries';
import { Summary } from '../model/summary';

const log = require('log4js').getLogger(__filename);
const pgp = require('pg-promise');


export class PostgresUtils extends DatabaseUtils {

    private connection: IMain<{}, IClient>;

    private static db: IDatabase<{}, IClient>;

    private columns: QueryColumns<Entity>;

    constructor(configuration?: DatabaseConfiguration, summary?: Summary) {
        super();
        this.connection = pgp();

        if (!PostgresUtils.db) {
            PostgresUtils.db = this.connection(configuration);
        }

        this._bulkData = [];
        this.summary = summary;
        this.columns = new this.connection.helpers.ColumnSet(['identifier', 'source', 'collection_id', 'dataset', 'raw'],
                        { table: PostgresQueries.tableName });
        this.createTables();
    }

    createTables() {
        PostgresUtils.db.none(PostgresQueries.createTable);
    }

    async pushToElastic3ReturnOfTheJedi(elastic: ElasticsearchUtils, source: string, processBucket: (bucket: Bucket) => Promise<EsOperation[]>): Promise<void> {
        throw new Error('Method not implemented.');
    }

    write(entity: Entity) {
        throw new Error('Method not implemented.');
    }

    /**
     * Execute a bulk upsert into the PSQL database
     * 
     * @param entities 
     * @returns number of affected rows
     */
    async bulk(entities: Entity[]): Promise<BulkResponse> {
        let bulkUpsertQuery = this.connection.helpers.insert(entities, this.columns) + PostgresQueries.onConflict;
        let result = await PostgresUtils.db.result(bulkUpsertQuery);

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

    sendBulkData(): Promise<BulkResponse> {
        if (this._bulkData.length > 0) {
            log.debug('Sending BULK message with ' + this._bulkData.length + ' items to persist');
            let promise = this.bulk(this._bulkData);
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

    beginTransaction(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    commitTransaction(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    rollbackTransaction(): Promise<void> {
        throw new Error('Method not implemented.');
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
}
