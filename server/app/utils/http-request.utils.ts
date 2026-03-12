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

import * as MiscUtils from './misc.utils.js';
import type { HeadersInit, RequestInit, Response } from 'node-fetch';
import fetch from 'node-fetch';
import log4js from 'log4js';
import { Agent } from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';

const log = log4js.getLogger('requests');

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
    maxFeatures?: number
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
    uri: string,
    accept?: string
    // We cannot give the signal directly in the config because it would start the timeout counter right away.
    // This option will be needed when we switch to native NodeJS (>= 18) fetch, which doesn't bring its own timeout param
    // timeout?: number
}

// too generous?
const DEFAULT_TIMEOUT_MS = 20000;

/**
 * Delegate class for handling HTTP-requests.
 */
export class RequestDelegate {

    private static domParser;

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
        if (!RequestDelegate.domParser) {
            RequestDelegate.domParser = MiscUtils.getDomParser();
        }
        if (config.body) {
            this.postBodyXml = RequestDelegate.domParser.parseFromString(config.body, 'application/xml');
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

    updateConfig(partialConfig: Partial<RequestOptions>): void {
        this.config = MiscUtils.merge(this.config, partialConfig);
    }

    getFullURL(): string {
        return RequestDelegate.getFullURL(this.config);
    }

    static getFullURL(config: RequestOptions): string {
        let fullURL = config.uri;
        if (config.qs) {
            fullURL += (config.uri.indexOf('?') > -1) ? '&' : '?';
            fullURL += new URLSearchParams(config.qs);
        }
        return fullURL;
    }

    /**
     * Performs the HTTP request and returns the result of this operation.
     *
     * @param retry how often the request should be retried if it fails (default: 0)
     * @param waitMilliSeconds wait time between retries in milliseconds (default: 0)
     */
    async doRequest(retry: number = 0, waitMilliSeconds: number = 0): Promise<any> {
        return RequestDelegate.doRequest(this.config, retry, waitMilliSeconds);
    }

    /**
     * Performs a HTTP request and returns the result of this operation.
     *
     * @param config the configuration to use when sending the request
     * @param retry how often the request should be retried if it fails (default: 0)
     * @param waitMilliSeconds wait time between retries in milliseconds (default: 0)
     */
    static async doRequest(config: RequestOptions, retry: number = 0, waitMilliSeconds: number = 0): Promise<any> {
        log.debug('Requesting: ' + config.uri);
        if (config.proxy) {
            let proxyAgent = new HttpsProxyAgent(config.proxy);
            // `=== false` is important here since rejectUnauthorized could be falsy (e.g. undefined)
            if (config.rejectUnauthorized === false) {
                proxyAgent.options.rejectUnauthorized = false;
            }
            config.agent = proxyAgent;
        }
        // `=== false` is important here since rejectUnauthorized could be falsy (e.g. undefined)
        else if (config.rejectUnauthorized === false) {
            config.agent = new Agent({
                rejectUnauthorized: false
            });
        }
        let fullURL = RequestDelegate.getFullURL(config);
        // set timeout for fetch
        // this is a workaround - we want to use `signal`, but cannot give it directly as it starts running as soon as
        // it is declared. `timeout` (which is deprecated) works different (worse). So we just take the timeout value
        // and create the signal here directly, then remove the timeout
        config.signal = AbortSignal.timeout(config.timeout ?? DEFAULT_TIMEOUT_MS);
        config.timeout = null;
        config.compress = false;
        let response = fetch(fullURL, config);

        if (config.resolveWithFullResponse) {
            return response;
        }

        let resolvedResponse: Response;
        do {
            try {
                resolvedResponse = await response;
                break;
            }
            catch (e) {
                // if a connection error occurs, retry
                if (retry > 0) {
                    retry -= 1;
                    log.info(`Retrying request for ${fullURL} (waiting ${waitMilliSeconds}ms)`);
                    await RequestDelegate.sleep(waitMilliSeconds);
                    response = fetch(fullURL, config);
                }
                else {
                    throw e;
                }
            }
        } while (retry > 0);

        if (config.json) {
            return resolvedResponse.json();
        }
        else {
            return resolvedResponse.text();
        }
    }

    private static sleep(ms: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}
