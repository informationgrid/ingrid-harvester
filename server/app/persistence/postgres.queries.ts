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
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader.js';

// NOTE: we are using a singleton class instead of a module
// because the members depend on the profile
export class PostgresQueries {

    private static instance: PostgresQueries;

    private constructor() {
    }

    public static getInstance() {
        if (!PostgresQueries.instance) {
            PostgresQueries.instance = new PostgresQueries();
        }
        return PostgresQueries.instance;
    }

    readonly createCollectionTable = this.readFile('createCollectionTable');
    readonly createRecordTable = this.readFile('createRecordTable');
    readonly createCouplingTable = this.readFile('createCouplingTable');
    readonly bulkUpsert = this.readFile('bulkUpsert');
    readonly bulkUpsertCoupling = this.readFile('bulkUpsertCoupling');
    readonly nonFetchedRatio = this.readFile('nonFetchedRatio');
    readonly deleteNonFetchedRecords = this.readFile('deleteNonFetchedRecords');
    readonly getStoredData = this.readFile('getStoredData');
    readonly getDatasetsBySource = this.readFile('getDatasetsBySource');
    readonly getIdentifiersByCatalog = this.readFile('getIdentifiersByCatalog');
    readonly getServices = this.readFile('getServices');
    readonly getBuckets = this.readFile('getBuckets');

    getModifiedBuckets(modifier: string): string {
        return this.readFile('getBuckets', modifier);
    }

    private readFile(script: string, modifier?: string): string {
        if (modifier) {
            script += `_${modifier}`;
        }
        // use script from profile if file exists there
        try {
            const profile = ProfileFactoryLoader.get().getProfileName();
            const profileQueryPath = `app/profiles/${profile}/persistence/queries/${script}.sql`;
            return fs.readFileSync(profileQueryPath, { encoding: 'utf8', flag: 'r' });
        }
        // otherwise, use default from `queries` dir
        catch (e) {
            const queryPath = `app/persistence/queries/${script}.sql`;
            return fs.readFileSync(queryPath, { encoding: 'utf8', flag: 'r' });
        }
    }
}
