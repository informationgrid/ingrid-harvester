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

import type { Client as Client6 } from 'elasticsearch6';
import type { Client as Client7 } from 'elasticsearch7';
import type { Client as Client8 } from 'elasticsearch8';
import type { Client as Client9 } from 'elasticsearch9';
import type { ElasticQueries } from './elastic.queries.js';
import type { Index } from '@shared/index.model.js';
import type { IndexConfiguration, IndexSettings } from './elastic.setting.js';
import type { Summary } from '../model/summary.js';
import { INGRID_META_INDEX } from '../profiles/ingrid/profile.factory.js';

export interface BulkResponse {
    queued: boolean;
    response?: any;
}

/**
 * Contains an operation to send to Elasticsearch via bulk request.
 */
export interface EsOperation {
    operation: 'index' | 'create' | 'update' | 'delete',
    _id: any,
    _index?: string,
    document?: any,
    _type?: string
}

export abstract class ElasticsearchUtils {

    protected client: Client6 | Client7 | Client8 | Client9;
    protected summary: Summary;

    public static maxBulkSize: number = 50;
    public elasticQueries: ElasticQueries;
    public indexName: string;
    public _bulkOperationChunks: object;//any[][];

    constructor(readonly config: IndexConfiguration) {
    }

    /**
     *
     * @param mapping
     * @param {IndexSettings} settings
     */
    abstract cloneIndex(mapping, settings: IndexSettings): Promise<void>;

    /**
     *
     * @param mappings
     * @param {IndexSettings} settings
     * @param {boolean} openIfPresent
     */
    abstract prepareIndex(mappings, settings: IndexSettings, openIfPresent?: boolean);

    /**
     *
     * @param {string} index
     * @param mappings
     * @param {IndexSettings} settings
     * @param {boolean} openIfPresent
     */
    abstract prepareIndexWithName(index: string, mappings, settings: IndexSettings, openIfPresent?: boolean);

    abstract finishIndex(closeIndex?: boolean);

    /**
     * Add the specified alias to an index.
     *
     * @param {string} index
     * @param {string} alias
     */
    abstract addAlias(index: string, alias: string): Promise<any>;

    /**
     * Get the list of aliases the specified index is part of.
     * 
     * @param {string} index 
     */
    abstract listAliases(index: string): Promise<string[]>;

    /**
     * Remove the specified alias from an index.
     *
     * @param {string} index
     * @param {string} alias
     */
    abstract removeAlias(index: string, alias: string): Promise<any>;

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
     *
     * @param {object} data
     */
    abstract bulkWithIndexName(index: string, type, data): Promise<BulkResponse>;

    /**
     * Add multiple operations to the bulk array which will be sent to the elasticsearch node
     * if a certain limit {{maxBulkSize}} is reached.
     *
     * The operations are sent in the same request.
     *
     * @param boxedOperations
     */
    abstract addOperationChunksToBulk(boxedOperations: EsOperation[]): Promise<BulkResponse>;

    /**
     * Add a document to the bulk array which will be sent to the elasticsearch node
     * if a certain limit {{maxBulkSize}} is reached.
     *
     * @param doc
     * @param {string|number} id
     * @param {number} maxBulkSize
     */
    abstract addDocToBulk(doc, id: string | number, maxBulkSize?: number): Promise<BulkResponse>;

    /**
     * Send all collected bulk data for an index if specified, for all otherwise .
     *
     * @param {string} index
     */
    abstract sendBulkOperations(index?: string): Promise<BulkResponse | void>;

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
    // abstract getStoredData(ids): Promise<Array<any>>;

    abstract deleteIndex(indicesToDelete: string | string[]): Promise<any>;

    abstract search(index: string | string[], body?: object, usePrefix?: boolean): Promise<{ hits: any, aggregations?: any }>;

    abstract get(index: string, id: string): Promise<any>;

    abstract getHistory(body: object, size?: number): Promise<{ history: any }>;

    abstract getAccessUrls(after_key): Promise<any>;

    abstract getFacetsByAttribution(): Promise<any>;

    abstract getIndexSettings(index: string): Promise<any>;

    abstract getIndexMapping(index: string): Promise<any>;

    abstract getAllEntries(index: string): Promise<any>;

    abstract isIndexPresent(index: string): Promise<boolean>;

    abstract index(index: string, document: object, usePrefix: boolean): Promise<void>;

    abstract update(index: string, id: string, document: object, usePrefix: boolean): Promise<void>;

    abstract deleteByQuery(days: number): Promise<void>;

    abstract deleteDocument(index: string, id: string): Promise<void>;

    abstract ping(): Promise<boolean>;

    async close(): Promise<void> {
        await this.client.close();
    };

    // abstract health(status?: 'green' | 'GREEN' | 'yellow' | 'YELLOW' | 'red' | 'RED'): Promise<any>;
    async health(status: 'green' | 'yellow' | 'red' = 'yellow'): Promise<any> {
        return (<{ health: Function }>this.client.cluster).health({ wait_for_status: status });
    }

    // abstract flush(): Promise<any>;
    async flush(body?: object): Promise<any> {
        return (<{ flush: Function }>this.client.indices).flush(body);
    };

    /**
     * Returns a new Timestamp string
     */
    // TODO replace this with a proper date format function instead of homebrew stuff?
    protected getTimeStamp(date) {
        let stamp = String(date.getFullYear());
        stamp += ('0' + (date.getMonth() + 1)).slice(-2);
        stamp += ('0' + date.getDate()).slice(-2);
        stamp += ('0' + date.getHours()).slice(-2);
        stamp += ('0' + date.getMinutes()).slice(-2);
        stamp += ('0' + date.getSeconds()).slice(-2);
        stamp += ('00' + date.getMilliseconds()).slice(-3);
        return stamp;
    }

    protected addPrefixIfNotExists(index: string | string[]): string | string[] {
        // system level exceptions, e.g. for ingrid_meta
        if (index == INGRID_META_INDEX) {
            return index;
        }

        const addPrefix = (index: string) => {
            let prefix = '';
            if (index != this.config.alias && !index.startsWith(this.config.prefix)) {
                prefix = this.config.prefix;
            }
            return prefix + index;
        }

        if (typeof index == 'string') {
            return addPrefix(index);
        }
        else if (typeof index == 'object') {
            return index.map(addPrefix);
        }
    }
}
