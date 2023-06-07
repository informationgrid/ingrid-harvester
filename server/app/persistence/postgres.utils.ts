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

import { tableName, PostgresQueries } from './postgres.queries';
import { BulkResponse, DatabaseUtils } from './database.utils';
import { ConfigService } from '../services/config/ConfigService';
import { DeduplicateUtils } from './deduplicate.utils';
import { Entity } from '../model/entity';
import { Client, Pool, PoolClient, QueryResult } from 'pg';
import pgpt from 'pg-promise';
import { IClient } from 'pg-promise/typescript/pg-subset';
import { DatabaseConfiguration } from '@shared/general-config.settings';

const log = require('log4js').getLogger(__filename);
const pgp = require('pg-promise');


export class PostgresUtils extends DatabaseUtils {

    // private pool: Pool;
    private connection: pgpt.IMain<{}, IClient>;

    private static db: pgpt.IDatabase<{}, IClient>;

    private columns: pgpt.QueryColumns<Entity>;

    constructor(databaseConfiguration?: DatabaseConfiguration) {
        super();
        // this.pool = new Pool({
        //     connectionString: ,
        //     user: ,
        //     password: 
        // });
        // let databaseConfiguration = ConfigService.getGeneralSettings().database;
        this.connection = pgp();

        // const cn = {
        //     host: 'localhost',
        //     port: 5433,
        //     database: 'my-database-name',
        //     user: 'user-name',
        //     password: 'user-password',
        //     max: 30 // use up to 30 connections
        
        //     // "types" - in case you want to set custom type parsers on the pool level
        // };
        if (!PostgresUtils.db) {
            PostgresUtils.db = this.connection(ConfigService.getGeneralSettings().database);
        }

        this._bulkData = [];

        this.columns = new this.connection.helpers.ColumnSet(['identifier', 'source', 'collection_id', 'dataset', 'raw'],
                        { table: tableName });
        this.createTables();
    }

    // preparedQuery(client: PoolClient, name: string, ...values: any[]) {
    //     client.query()
    // }

    createTables() {
        PostgresUtils.db.none(PostgresQueries.createTable);
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
