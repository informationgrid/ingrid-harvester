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

import * as fs from 'fs';
import * as path from 'path';
import { PostgresQueries as AbstractPostgresQueries } from '../../../persistence/postgres.queries';

export class PostgresQueries extends AbstractPostgresQueries {

    private static instance: PostgresQueries;

    private constructor() {
        super();
    }

    public static getInstance() {
        if (!this.instance) {
            PostgresQueries.instance = new PostgresQueries();
        }
        return PostgresQueries.instance;
    }

    readonly createCollectionTable = this.readFile('createCollectionTable');
    readonly createRecordTable = this.readFile('createRecordTable');
    readonly createCouplingTable = this.readFile('createCouplingTable');
    readonly createCollection = this.readFile('createCollection');
    readonly getCollection = this.readFile('getCollection');
    readonly bulkUpsert = this.readFile('bulkUpsert');
    readonly bulkUpsertCoupling = this.readFile('bulkUpsertCoupling');
    readonly getRecords = this.readFile('getRecords');
    readonly getStoredData = this.readFile('getStoredData');
    readonly getBuckets = this.readFile('getBuckets');

    private readFile(scriptName: string): string {
        return fs.readFileSync(path.resolve(__dirname, `./queries/${scriptName}.sql`), { encoding: 'utf8', flag: 'r' });
    }
}
