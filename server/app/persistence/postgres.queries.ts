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

import * as fs from 'fs';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader';

export class PostgresQueries {

    private static instance: PostgresQueries;

    private constructor() {
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
    readonly getCollectionSizes = this.readFile('getCollectionSizes');
    readonly listCollections = this.readFile('listCollections');
    readonly createCollection = this.readFile('createCollection');
    readonly getCollection = this.readFile('getCollection');
    readonly updateCollection = this.readFile('updateCollection');
    readonly deleteCollection = this.readFile('deleteCollection');
    readonly bulkUpsert = this.readFile('bulkUpsert');
    readonly bulkUpsertCoupling = this.readFile('bulkUpsertCoupling');
    readonly nonFetchedRatio = this.readFile('nonFetchedRatio');
    readonly deleteNonFetchedRecords = this.readFile('deleteNonFetchedRecords');
    readonly getStoredData = this.readFile('getStoredData');
    readonly getDatasetsBySource = this.readFile('getDatasetsBySource');
    readonly getDatasetsByCollection = this.readFile('getDatasetsByCollection');
    readonly getServices = this.readFile('getServices');
    readonly getBuckets = this.readFile('getBuckets');

    private readFile(script: string): string {
        let profile = ProfileFactoryLoader.get().getProfileName();
        return fs.readFileSync(`app/profiles/${profile}/persistence/queries/${script}.sql`, { encoding: 'utf8', flag: 'r' });
    }
}
