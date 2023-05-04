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

import fetch, { HeadersInit, RequestInit } from 'node-fetch';
import { getLogger } from 'log4js';
import { Agent } from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { MiscUtils } from './misc.utils';

let DomParser = require('@xmldom/xmldom').DOMParser;
let logRequest = getLogger('requests');

/**
 * HTTP parameters configuration for CSW harvesters.
 */
export interface CswParameters {
    readonly request: 'GetRecords' | 'GetCapabilities',
    readonly SERVICE: 'CSW',
    readonly VERSION: '2.0.2',  // Current use cases don't use any other value
    readonly elementSetName?: 'brief' | 'summary' | 'full',
    readonly resultType?: 'hits' | 'results' | 'validate',
    readonly outputFormat?: 'application/xml',
    readonly outputSchema?: 'http://www.isotc211.org/2005/gmd',
    readonly typeNames?: 'gmd:MD_Metadata',
    readonly CONSTRAINTLANGUAGE?: 'FILTER' | 'CQL_TEXT',
    readonly CONSTRAINT_LANGUAGE_VERSION?: '1.1.0',
    readonly constraint?: string,

    startPosition?: number,
    maxRecords?: number
}

/**
 * HTTP parameters configuration for WFS harvesters.
 */
export interface WfsParameters {
    readonly request: 'GetFeature' | 'GetCapabilities',
    readonly SERVICE: 'WFS',
    readonly VERSION: '2.0.0' | '1.1.0',
    readonly resultType?: 'hits' | 'results',
    readonly typename?: string,
    readonly CONSTRAINTLANGUAGE?: 'FILTER' | 'CQL_TEXT',
    readonly CONSTRAINT_LANGUAGE_VERSION?: '1.1.0',
    readonly constraint?: string,

    startPosition?: number,
    maxRecords?: number
}

/**
 * HTTP parameters configuration for CKAN harvesters. Since all keys of this
 * object are empty, it can also be used for requests that don't set any
 * parameters.
 */
export interface CkanParameters {
    readonly sort?: "id asc", // Hardcoded to the only used value currently being used

    start?: number,
    rows?: number,
    fq?: string
}

export interface CkanParametersListWithResources {
    limit?: number,
    offset?: number
}

export interface RequestPaging {
    // the query parameter to be used for setting the start record
    startFieldName: string;

    // the position to start to fetch the new records
    startPosition: number;

    // the number of records to fetch
    numRecords: number;

}

// TODO most of these could be made obsolete
// for a quicker migration we just emulate old request(-promise) options
export interface RequestOptions extends RequestInit {
    json?: boolean,
    proxy?: string,
    qs?: string | string[][] | Record<string, any> | URLSearchParams,
    rejectUnauthorized?: boolean,
    resolveWithFullResponse?: boolean,
    uri: string;
}

/**
 * Delegate class for handling HTTP-requests.
 */
export class RequestDelegate {
    private config: RequestOptions;
    private readonly postBodyXml: any;
    private paging: RequestPaging;

    /**
     * Create a delegate object for handling HTTP requests
     *
     * @param config configuration to use for the HTTP requests
     * @param paging
     */
    constructor(config: RequestOptions, paging?: RequestPaging) {
        this.config = config;
        if (config.body) {
            this.postBodyXml = new DomParser().parseFromString(config.body, 'application/xml');
        }

        this.paging = paging;
    }

    /**
     * Returns the default HTTP headers that can be used for harvesting requests.
     * The headers only consist of the User-Agent set to a value of:
     * 'Ingrid Harvester. node-fetch'
     */
    static defaultRequestHeaders(): HeadersInit {
        return {
            'User-Agent': 'Ingrid Harvester. node-fetch'
        };
    }

    /**
     * Returns the default HTTP request headers that can be used for CSW
     * harvesting requests. The headers that are set are:
     * - User-Agent: Ingrid Harvester. node-fetch
     * - Content-Type: application/xml
     */
    static cswRequestHeaders(): HeadersInit {
        return {
            'User-Agent': 'Ingrid Harvester. node-fetch',
            'Content-Type': 'application/xml'
        };
    }

    /**
     * Returns the default HTTP request headers that can be used for WFS
     * harvesting requests. The headers that are set are:
     * - User-Agent: Ingrid Harvester. node-fetch
     * - Content-Type: application/xml
     */
    static wfsRequestHeaders(): HeadersInit {
        return {
            'User-Agent': 'Ingrid Harvester. node-fetch',
            'Content-Type': 'application/xml'
        };
    }

    /**
     * Returns the starting index for the next batch of records to be harvested
     * from the upstream server.
     *
     * @return the starting index for the next batch of records to be harvested
     */
    getStartRecordIndex(): number {
        return this.paging.startPosition;
    }

    /**
     * Increments the starting index for the next batch of records to fetch from
     * the upstream server. If the request is a CSW request and consists of an
     * XML body, the starting index will be updated in the GET parameters
     * or the XML body.
     */
    incrementStartRecordIndex(): void {
        this.paging.startPosition += this.paging.numRecords;

        if (this.postBodyXml) {
            // update body element
            this.postBodyXml.documentElement.setAttribute(this.paging.startFieldName, this.paging.startPosition);
            this.config.body = this.postBodyXml.toString();
        } else {
            // update query parameter
            this.config.qs[this.paging.startFieldName] = this.paging.startPosition;
        }
    }

    updateConfig(partialConfig: any): void {
        this.config = MiscUtils.merge(this.config, partialConfig);
    }

    /**
     * Performs the HTTP request and returns the result of this operation. If
     * the optional callback is provided, then it too if forwarded to the
     * request.
     *
     * @param callback optional callback for the request library
     */
    async doRequest(): Promise<any> {
        logRequest.debug('Requesting: ' + this.config.uri);
        if (this.config.proxy) {
            let url = new URL(this.config.proxy);
            this.config.agent = new HttpsProxyAgent({
                rejectUnauthorized: this.config.rejectUnauthorized ?? true,
                host: url.hostname,
                port: url.port
            });
        }
        // `== false` is important here since rejectUnauthorized could be falsy (e.g. undefined)
        else if (this.config.rejectUnauthorized == false) {
            this.config.agent = new Agent({
                rejectUnauthorized: false
            });
        }
        let response = fetch(this.config.uri + '?' + new URLSearchParams(this.config.qs), this.config);
        if (this.config.resolveWithFullResponse) {
            return response;
        }
        else if (this.config.json) {
            return (await response).json();
        }
        else {
            return (await response).text();
        }
    }
}

