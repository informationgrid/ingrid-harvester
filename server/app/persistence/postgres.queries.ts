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

export class PostgresQueries {

    static tableName = 'dataset';

    static onConflict = ` ON CONFLICT ON CONSTRAINT ${PostgresQueries.tableName}_pkey DO UPDATE SET
        dataset = EXCLUDED.dataset, 
        raw = EXCLUDED.raw, 
        last_modified = NOW()`;

    static bulkUpsert = `INSERT INTO ${PostgresQueries.tableName} (identifier, source, collection_id, dataset, raw)
        SELECT identifier, source, collection_id, dataset, raw
        FROM json_populate_recordset(null::${PostgresQueries.tableName}, $1)
        ${PostgresQueries.onConflict}`;

    static createTable = `CREATE TABLE IF NOT EXISTS public.${PostgresQueries.tableName} (
        id SERIAL,
        identifier VARCHAR(255),
        source VARCHAR(255),
        collection_id VARCHAR(255),
        dataset JSONB,
        raw TEXT,
        created_on TIMESTAMP(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_modified TIMESTAMP(6) with time zone NULL,
        PRIMARY KEY(identifier, source))`;

    static readDatasets = `SELECT dataset FROM public.${PostgresQueries.tableName}`;

    static getBuckets = (source: string) => `SELECT A.id as primary_id, B.id as id, B.identifier as identifier,
        B.dataset as dataset, A.id = B.id as is_primary,
        (A.dataset->>'alternateTitle' = B.dataset->>'alternateTitle' AND A.id != B.id) as is_duplicate,
        B.dataset->'extras'->'operates_on' ? A.identifier as is_operating_service
        FROM ${PostgresQueries.tableName} as A
        LEFT JOIN ${PostgresQueries.tableName} as B
        ON (
            A.dataset->>'alternateTitle' = B.dataset->>'alternateTitle'
            OR B.dataset->'extras'->'operates_on' ? A.identifier
        )
        WHERE A.source = '${source}'
            AND A.dataset->'extras'->>'hierarchy_level' = 'dataset'
        ORDER BY primary_id`;
}
