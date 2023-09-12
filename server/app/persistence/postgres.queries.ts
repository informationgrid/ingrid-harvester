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

export abstract class PostgresQueries {

    abstract readonly collectionTableName: string;
    abstract readonly datasetTableName: string;
    abstract readonly createCollectionTable: string;
    abstract readonly createDatasetTable: string;
    abstract readonly onConflict: string;
    abstract readonly bulkUpsert: string;
    abstract readonly readDatasets: string;
    abstract readonly getStoredData: string;
    abstract readonly getCatalog: string;

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
    abstract getBuckets(source: string): string;
}
