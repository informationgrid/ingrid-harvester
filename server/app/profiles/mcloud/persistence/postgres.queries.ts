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

    readonly tableName = 'dataset';

    readonly createTable = `CREATE TABLE IF NOT EXISTS public.${this.tableName} (
        id SERIAL,
        identifier VARCHAR(255) NOT NULL,
        source VARCHAR(255) NOT NULL,
        operates_on VARCHAR(255)[],
        collection_id VARCHAR(255),
        dataset JSONB,
        raw TEXT,
        created_on TIMESTAMP(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_modified TIMESTAMP(6) with time zone NULL,
        PRIMARY KEY(identifier, source))`;

    readonly onConflict = `ON CONFLICT ON CONSTRAINT ${this.tableName}_pkey DO UPDATE SET
        operates_on = EXCLUDED.operates_on,
        dataset = EXCLUDED.dataset,
        raw = COALESCE(EXCLUDED.raw, ${this.tableName}.raw),
        last_modified = NOW()`;

    readonly bulkUpsert = `INSERT INTO ${this.tableName} (identifier, source, collection_id, operates_on, dataset, raw)
        SELECT identifier, source, collection_id, operates_on, dataset, raw
        FROM json_populate_recordset(null::${this.tableName}, $1)
        ${this.onConflict}`;

    readonly readDatasets = `SELECT dataset FROM public.${this.tableName}`;

    readonly getStoredData = `SELECT dataset FROM public.${this.tableName}
        WHERE identifier = ANY ($1)`;

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
    getBuckets = (source: string) =>
        `(
            SELECT anchor.id AS anchor_id,
                secondary.id AS id,
                secondary.source AS source,
                secondary.dataset AS dataset,
                false AS is_service,
                secondary.created_on AS issued,
                secondary.last_modified AS modified
            FROM public.${this.tableName} AS anchor
            LEFT JOIN public.${this.tableName} AS secondary
            ON anchor.dataset->>'title' = secondary.dataset->>'title'
            WHERE anchor.source = '${source}'
                AND anchor.dataset->'extras'->>'hierarchy_level' != 'service'
        )
        UNION
        (
            SELECT ds.id AS anchor_id,
                service.id AS id,
                service.source AS source,
                service.dataset AS dataset,
                true AS is_service,
                service.created_on AS issued,
                service.last_modified AS modified
            FROM public.${this.tableName} AS service
            LEFT JOIN public.${this.tableName} AS ds
            ON ds.identifier = ANY(service.operates_on)
            WHERE ds.source = '${source}'
                AND service.dataset->'extras'->>'hierarchy_level' = 'service'
        )
        ORDER BY anchor_id`;
}
