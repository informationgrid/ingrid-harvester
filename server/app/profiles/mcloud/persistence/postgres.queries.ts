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
        collection_id INTEGER,
        dataset JSONB,
        original_document TEXT,
        created_on TIMESTAMP(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_modified TIMESTAMP(6) with time zone NULL,
        CONSTRAINT ${this.datasetTableName}_pkey PRIMARY KEY(id),
        CONSTRAINT record_full_identifier UNIQUE(identifier, collection_id),
        CONSTRAINT fkivo5l0rletq7kni6xstvejy5a FOREIGN KEY(collection_id) REFERENCES public.${this.collectionTableName}(id)
    );`;

    readonly createCouplingTable = `CREATE TABLE IF NOT EXISTS public.coupling (
            id SERIAL,
            dataset_identifier VARCHAR(255) NOT NULL,
            service_id VARCHAR(255) NOT NULL,
            service_type VARCHAR(255) NOT NULL,
            distribution JSONB,
            CONSTRAINT coupling_pkey PRIMARY KEY(id),
            CONSTRAINT coupling_full_identifier UNIQUE(dataset_identifier, service_id, service_type)
        );
        CREATE INDEX IF NOT EXISTS dataset_identifier_idx
            ON public.coupling (dataset_identifier);
        CREATE INDEX IF NOT EXISTS service_id_idx
            ON public.coupling (service_id);`;

    readonly createCollection = `INSERT INTO public.${this.collectionTableName} (identifier, properties, original_document, dcat_ap_plu, json)
        VALUES($1, $2, $3, $4, $5)
        RETURNING id`;

    readonly getCollection = `SELECT * FROM public.${this.collectionTableName}
        WHERE identifier = $1`;

    readonly bulkUpsert = `INSERT INTO public.${this.datasetTableName} (identifier, source, collection_id, dataset, original_document)
        SELECT identifier, source, collection_id, dataset, original_document
        FROM json_populate_recordset(null::public.${this.datasetTableName}, $1)
        ON CONFLICT ON CONSTRAINT record_full_identifier DO UPDATE SET
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

    readonly bulkUpsertCoupling = `INSERT INTO public.coupling (dataset_identifier, service_id, service_type, distribution)
        SELECT
            dataset_identifier,
            service_id,
            service_type,
            distribution
        FROM json_populate_recordset(null::public.coupling, $1)
            ON CONFLICT
            ON CONSTRAINT coupling_full_identifier
        DO UPDATE SET
            distribution = EXCLUDED.distribution`;

    readonly nonFetchedRatio = `SELECT
        SUM(CASE WHEN (last_modified IS NULL OR $2::timestamptz > last_modified) THEN 1 ELSE 0 END) AS nonfetched,
        COUNT(*) AS total
        FROM record WHERE source = $1`;

    readonly deleteRecords = `DELETE FROM public.${this.datasetTableName}
        WHERE source = $1 AND (last_modified IS NULL OR last_modified < $2)`;

    readonly getStoredData = `SELECT dataset FROM public.${this.datasetTableName}
        WHERE identifier = ANY($1)`;

    readonly getDatasets = `SELECT id, dataset
        FROM public.record
        WHERE source = $1
            AND dataset->'extras'->>'hierarchy_level' != 'service'`;

    readonly getServices = `SELECT id, dataset
        FROM public.record
        WHERE source = $1
            AND dataset->'extras'->>'hierarchy_level' = 'service'`;

    /**
     * Create a query for retrieving all items for a given source.
     * 
     * With each result row representing an item, this query should expose the following columns:
     * - anchor_id: the ID of the dataset this item is a duplicate of, or is a service to
     * - id: the ID of the item
     * - source: the source of this item
     * - dataset: the dataset document of this item
     * - service_type: the type of the service, or `null` if it is a dataset
     * - issued
     * - modified
     * 
     * @param source the source of the requested items
     * @returns a database query to return grouped (by `primary_id`) items of rows representing items
     */
    readonly getBuckets =
        `(
            SELECT
                anchor.id AS anchor_id,
                secondary.id AS id,
                secondary.source AS source,
                secondary.dataset AS dataset,
                secondary.collection_id AS catalog_id,
                null AS service_type,
                secondary.created_on AS issued,
                secondary.last_modified AS modified
            FROM public.record AS anchor
            LEFT JOIN public.record AS secondary
            ON (
                    anchor.dataset->>'plan_name' = secondary.dataset->>'plan_name'
                    OR (
                        anchor.identifier = secondary.identifier
                        AND anchor.collection_id = secondary.collection_id
                    )
                )
                AND (
                    anchor.source != secondary.source
                    OR anchor.id = secondary.id
                )
            WHERE
                anchor.source = $1
                AND anchor.dataset->'extras'->>'hierarchy_level' IS DISTINCT FROM 'service'
        )
        UNION
        (
            SELECT
                ds.id AS anchor_id,
                service.id AS id,
                ds.source AS source,
                service.distribution AS dataset,
                ds.collection_id AS catalog_id,
                service.service_type AS service_type,
                ds.created_on AS issued,
                ds.last_modified AS modified
            FROM public.coupling AS service
            LEFT JOIN public.record AS ds
            ON
                ds.identifier = service.dataset_identifier
            WHERE
                ds.source = $1
        )`;
}
