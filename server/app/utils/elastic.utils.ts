/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import { Client as Client6 } from 'elasticsearch6';
import { Client as Client7 } from 'elasticsearch7';
import { Client as Client8 } from 'elasticsearch8';
import { DeduplicateUtils } from './deduplicate.utils';
import { ElasticSettings } from './elastic.setting';
import { Index } from '@shared/index.model';

export const DefaultElasticsearchSettings: ElasticSettings = {
    elasticSearchUrl: process.env.ELASTIC_URL || "http://elastic:9200",
    elasticSearchVersion: '8',
    elasticSearchUser: 'elastic',
    index: '',
    // alias: '',
    includeTimestamp: true,
};

export interface BulkResponse {
    queued: boolean;
    response?: any;
}

export abstract class ElasticSearchUtils {

    protected client: Client6 | Client7 | Client8;
    protected static readonly LENGTH_OF_TIMESTAMP = 18;

    public static maxBulkSize: number = 50;
    public deduplicationUtils: DeduplicateUtils;
    public indexName: string;
    public _bulkData: any[];

    /**
     *
     * @param mapping
     * @param settings
     */
    abstract cloneIndex(mapping, settings);

    /**
     *
     * @param mappings
     * @param settings
     */
    abstract prepareIndex(mappings, settings, openIfPresent?);

    /**
     *
     * @param mappings
     * @param settings
     */
    abstract prepareIndexWithName(indexName: string, mappings, settings, openIfPresent?: boolean);

    abstract finishIndex(closeIndex?: boolean);

    /**
     * Add the specified alias to an index.
     *
     * @param {string} index
     * @param {string} alias
     */
    abstract addAlias(index, alias): Promise<any>;

    /**
     * Remove the specified alias from an index.
     *
     * @param {string} index
     * @param {string} alias
     */
    abstract removeAlias(index, alias): Promise<any>;

    /**
     * Delete all indices starting with indexBaseName but not indexName .
     *
     * @param {string} indexBaseName
     * @param {string} ignoreIndexName
     */
    abstract deleteOldIndices(indexBaseName, ignoreIndexName);

    abstract getIndicesFromBasename(baseName: string): Promise<Index[]>;

    /**
     * Index data in batches
     * @param {object} data
     * @param {boolean} closeAfterBulk
     */
    abstract bulk(data, closeAfterBulk): Promise<BulkResponse>;

    abstract bulkWithIndexName(indexName, type, data, closeAfterBulk): Promise<BulkResponse>;

    /**
     * Add a document to the bulk array which will be sent to the elasticsearch node
     * if a certain limit {{maxBulkSize}} is reached.
     * @param doc
     * @param {string|number} id
     */
    abstract addDocToBulk(doc, id, maxBulkSize?: number): Promise<BulkResponse>;

    /**
     * Send all collected bulk data if any.
     *
     * @param {boolean=} closeAfterBulk
     */
    abstract sendBulkData(closeAfterBulk?): Promise<BulkResponse>;

    /**
     * Searches the index for documents with the given ids and copies a set of the issued
     * date, modified date and harvested data from existing documents, if any exist. If multiple documents with
     * the same id are found, then the issued date is copied from the first hit
     * returned by elasticsearch. If no indexed document with the given id is
     * found, then null or undefined is returned.
     *
     * @param ids {Array} array of ids for which to look up the issued date
     * @returns {Promise<Array>}  array of issued dates (for found documents) or
     * nulls (for new documents) in the same order as the given ids
     */
    abstract getStoredData(ids): Promise<Array<any>>;

    abstract deleteIndex(indicesToDelete: string | string[]): Promise<any>;

    abstract search(index: string | string[], body?: object, size?: number): Promise<{ hits: any, aggregations?: any }>;

    // abstract getHistory(baseIndex: string): Promise<any>;
    abstract getHistory(index: string, body: object): Promise<{ history: any }>;

    abstract getHistories(): Promise<any>;

    abstract getAccessUrls(after_key): Promise<any>;

    abstract getFacetsByAttribution(): Promise<any>;

    abstract getIndexSettings(index: string): Promise<any>;

    abstract getIndexMapping(index: string): Promise<any>;

    abstract getAllEntries(index: string): Promise<any>;

    abstract isIndexPresent(index: string): Promise<boolean>;

    abstract index(index: string, document: object): Promise<void>;

    abstract deleteByQuery(days: number): Promise<void>;

    abstract deleteDocument(index: string, id: string): Promise<void>;

    // abstract health(status?: 'green' | 'GREEN' | 'yellow' | 'YELLOW' | 'red' | 'RED'): Promise<any>;
    async health(status: 'green' | 'yellow' | 'red' = 'yellow'): Promise<any> {
        return (<{ health: Function }>this.client.cluster).health({ wait_for_status: status });
    }

    // abstract flush(): Promise<any>;
    async flush(body?: object): Promise<any> {
        return (<{ flush: Function }>this.client.indices).flush(body);
    };
}
