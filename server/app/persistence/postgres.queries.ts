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
        operates_on = EXCLUDED.operates_on,
        dataset = EXCLUDED.dataset, 
        raw = EXCLUDED.raw, 
        last_modified = NOW()`;

    static bulkUpsert = `INSERT INTO ${PostgresQueries.tableName} (identifier, source, collection_id, operates_on, dataset, raw)
        SELECT identifier, source, collection_id, operates_on, dataset, raw
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

    /**
     * Create a query for retrieving all items for a given source.
     * 
     * With each result row representing an item, this query should expose the following columns:
     * - id: the ID of the item
     * - primary_id: the ID of the dataset this item is a duplicate of, or is a service to
     * - is_primary: true, if this item is the primary dataset
     * - is_duplicate: true, if this item is a duplicate of the primary dataset
     * - is_service: true, if this item is a service to the primary dataset
     * - dataset: the dataset document of this item
     * 
     * @param source the source of the requested items
     * @returns a database query to return grouped (by `primary_id`) items of rows representing items
     */
    static getBuckets = (source: string) =>
        `SELECT 
            COALESCE(coupled.service_id, deduplicated.duplicate_id) AS id,
            deduplicated.primary_id AS primary_id,
            deduplicated.is_primary AS is_primary,
            (not deduplicated.is_primary) AS is_duplicate,
            COALESCE(coupled.is_service, false) AS is_service,
            COALESCE(coupled.dataset, deduplicated.dataset) AS dataset
        FROM (
            SELECT prim.id AS primary_id, duplicate.id AS duplicate_id,
                prim.identifier AS prim_identifier, duplicate.identifier AS dupl_identifier,
                duplicate.id = prim.id AS is_primary,
                duplicate.dataset AS dataset
            FROM public.${PostgresQueries.tableName} AS prim
            LEFT JOIN public.${PostgresQueries.tableName} AS duplicate
            ON prim.dataset->>'alternateTitle' = duplicate.dataset->>'alternateTitle'
            WHERE prim.source = '${source}'
                AND (prim.source != duplicate.source OR prim.id = duplicate.id)
        ) AS deduplicated
        LEFT JOIN (
            SELECT ds.id AS dataset_id, service.id AS service_id, ds.identifier AS dataset_identifier,
                service.dataset AS dataset,
                service.dataset->'extras'->'operates_on' AS OPERATES,
                true AS is_service
            FROM public.${PostgresQueries.tableName} AS ds
            LEFT JOIN public.${PostgresQueries.tableName} AS service
            ON ds.identifier = ANY(service.operates_on)
            WHERE ds.source = '${source}'
                AND service.dataset->'extras'->>'hierarchy_level' = 'service'
        ) AS coupled
        ON
            deduplicated.primary_id = coupled.dataset_id
        ORDER BY deduplicated.primary_id`;
}
