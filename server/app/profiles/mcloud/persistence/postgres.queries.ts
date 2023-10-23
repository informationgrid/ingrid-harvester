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

    readonly collectionTableName = 'collection';
    readonly datasetTableName = 'record';

    readonly createCollectionTable = `CREATE TABLE IF NOT EXISTS public.${this.collectionTableName} (
        id SERIAL,
        identifier VARCHAR(255) NOT NULL UNIQUE,
        properties JSONB,
        original_document TEXT,
        dcat_ap_plu TEXT,
        json TEXT,
        created_on TIMESTAMP(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_modified TIMESTAMP(6) with time zone NULL,
        CONSTRAINT ${this.collectionTableName}_pkey PRIMARY KEY(id)
    );`;

    readonly createRecordTable = `CREATE TABLE IF NOT EXISTS public.${this.datasetTableName} (
        id SERIAL,
        identifier VARCHAR(255) NOT NULL,
        source VARCHAR(255) NOT NULL,
        operates_on VARCHAR(255)[],
        collection_id INTEGER,
        dataset JSONB,
        original_document TEXT,
        created_on TIMESTAMP(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_modified TIMESTAMP(6) with time zone NULL,
        CONSTRAINT ${this.datasetTableName}_pkey PRIMARY KEY(id),
        CONSTRAINT record_full_identifier UNIQUE(identifier, collection_id),
        CONSTRAINT fkivo5l0rletq7kni6xstvejy5a FOREIGN KEY(collection_id) REFERENCES public.${this.collectionTableName}(id)
    );`;

    readonly createCollection = `INSERT INTO public.${this.collectionTableName} (identifier, properties, original_document, dcat_ap_plu, json)
        VALUES($1, $2, $3, $4, $5)
        RETURNING id`;

    readonly getCollection = `SELECT * FROM public.${this.collectionTableName}
        WHERE identifier = $1`;

    readonly bulkUpsert = `INSERT INTO public.${this.datasetTableName} (identifier, source, collection_id, operates_on, dataset, original_document)
        SELECT identifier, source, collection_id, operates_on, dataset, original_document
        FROM json_populate_recordset(null::public.${this.datasetTableName}, $1)
        ON CONFLICT ON CONSTRAINT record_full_identifier DO UPDATE SET
        operates_on = EXCLUDED.operates_on,
        dataset = EXCLUDED.dataset,
        original_document = COALESCE(EXCLUDED.original_document, ${this.datasetTableName}.original_document),
        last_modified = NOW()
        WHERE (
            (
                EXCLUDED.dataset->'modified' IS NOT NULL
                AND ${this.datasetTableName}.dataset->'modified' IS NULL
            )
            OR EXCLUDED.dataset->'modified' > ${this.datasetTableName}.dataset->'modified'
        ) OR (
            (
                EXCLUDED.dataset->'extras'->'metadata'->'modified' IS NOT NULL
                AND ${this.datasetTableName}.dataset->'extras'->'metadata'->'modified' IS NULL
            )
            OR EXCLUDED.dataset->'extras'->'metadata'->'modified' > ${this.datasetTableName}.dataset->'extras'->'metadata'->'modified'
        )`;

    readonly getRecords = `SELECT dataset FROM public.${this.datasetTableName}`;

    readonly getStoredData = `SELECT dataset FROM public.${this.datasetTableName}
        WHERE identifier = ANY($1)`;

    /**
     * Create a query for retrieving all items for a given source.
     * 
     * With each result row representing an item, this query should expose the following columns:
     * - anchor_id: the ID of the dataset this item is a duplicate of, or is a service to
     * - id: the ID of the item
     * - source: the source of this item
     * - dataset: the dataset document of this item
     * - is_service: true, if this item is a service to the primary dataset
     * - issued
     * - modified
     * 
     * @param source the source of the requested items
     * @returns a database query to return grouped (by `primary_id`) items of rows representing items
     */
    readonly getBuckets =
        `(
            SELECT anchor.id AS anchor_id,
                secondary.id AS id,
                secondary.source AS source,
                secondary.dataset AS dataset,
                false AS is_service,
                secondary.created_on AS issued,
                secondary.last_modified AS modified
            FROM public.${this.datasetTableName} AS anchor
            LEFT JOIN public.${this.datasetTableName} AS secondary
            ON anchor.dataset->>'title' = secondary.dataset->>'title'
            WHERE anchor.source = $1
                AND anchor.dataset->'extras'->>'hierarchy_level' IS DISTINCT FROM 'service'
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
            FROM public.${this.datasetTableName} AS service
            LEFT JOIN public.${this.datasetTableName} AS ds
            ON ds.identifier = ANY(service.operates_on)
            WHERE ds.source = $1
                AND service.dataset->'extras'->>'hierarchy_level' = 'service'
        )
        ORDER BY anchor_id`;
}
