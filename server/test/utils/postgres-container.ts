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
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import { PostgresUtils } from '../../app/persistence/postgres.utils.js';

let container: StartedPostgreSqlContainer | null = null;
let pool: pg.Pool | null = null;
let currentConfig: DatabaseConfiguration | null = null;
let startPromise: Promise<DatabaseConfiguration> | null = null;

export function getTestDatabaseConfig(): DatabaseConfiguration {
    if (process.env.TEST_DB_HOST) {
        return {
            type: 'postgresql',
            host: process.env.TEST_DB_HOST,
            port: Number(process.env.TEST_DB_PORT) || 5432,
            database: process.env.TEST_DB_NAME || 'metadaten',
            user: process.env.TEST_DB_USER || 'postgres',
            password: process.env.TEST_DB_PASSWORD || 'postgres'
        };
    }
    if (currentConfig) {
        return currentConfig;
    }
    throw new Error('PostgreSQL test container has not been started yet.');
}

export async function startPostgresContainer(): Promise<DatabaseConfiguration> {
    if (currentConfig && pool) {
        return currentConfig;
    }

    if (startPromise) {
        return startPromise;
    }

    startPromise = (async () => {
        if (process.env.TEST_DB_HOST) {
            currentConfig = {
                type: 'postgresql',
                host: process.env.TEST_DB_HOST,
                port: Number(process.env.TEST_DB_PORT) || 5432,
                database: process.env.TEST_DB_NAME || 'metadaten',
                user: process.env.TEST_DB_USER || 'postgres',
                password: process.env.TEST_DB_PASSWORD || 'postgres'
            };
            if (!pool) {
                pool = new pg.Pool(currentConfig);
            }
            (PostgresUtils as any).pool = pool;
            return currentConfig;
        }

        if (!container) {
            container = await new PostgreSqlContainer('postgres:16-alpine')
                .withDatabase('metadaten')
                .withUsername('ogcrecords')
                .withPassword('ogcrecords')
                .start();
        }

        currentConfig = {
            type: 'postgresql',
            host: container.getHost(),
            port: container.getPort(),
            database: container.getDatabase(),
            user: container.getUsername(),
            password: container.getPassword()
        };

        if (!pool) {
            pool = new pg.Pool(currentConfig);
        }
        (PostgresUtils as any).pool = pool;

        return currentConfig;
    })();

    try {
        return await startPromise;
    }
    finally {
        startPromise = null;
    }
}

export async function stopPostgresContainer(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
    if ((PostgresUtils as any).pool) {
        (PostgresUtils as any).pool = null;
    }
    if (container) {
        await container.stop();
        container = null;
    }
    currentConfig = null;
    startPromise = null;
}

export async function resetDatabase(): Promise<void> {
    if (pool) {
        await pool.query('TRUNCATE TABLE public.record, public.coupling, public.collection CASCADE;');
    }
}

export async function truncateTables(): Promise<void> {
    return resetDatabase();
}
