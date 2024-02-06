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

    abstract readonly createCollectionTable: string;
    abstract readonly createRecordTable: string;
    abstract readonly createCouplingTable: string;
    abstract readonly createCollection: string;
    abstract readonly getCollection: string;
    abstract readonly bulkUpsert: string;
    abstract readonly bulkUpsertCoupling: string;
    abstract readonly getStoredData: string;
    abstract readonly getDatasets: string;
    abstract readonly getServices: string;

    /**
     * Query for retrieving all items for a given source.
     * "all items" comprise
     * - datasets of the source
     * - services operating on these datasets
     * - duplicates of these datasets
     * - services operating on the duplicates
     * 
     * With each result row representing an item, this query should expose the following columns:
     * - anchor_id: the ID of the dataset this item is a duplicate of, or is a service to (even by proxy)
     * - id: the actual ID of this item
     * - source: the source of this item
     * - dataset: the dataset json document of this item
     * - service_type: the type of the service, or `null` if it is a dataset
     * - issued,
     * - modified
     * 
     * @param source the source of the requested items
     * @returns a database query to return grouped (by `primary_id`) items of rows representing items
     */
    abstract readonly getBuckets: string;
}
