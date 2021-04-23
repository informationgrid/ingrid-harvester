import {getLogger} from "log4js";
import {OptionsWithUri} from "request-promise";
import {Headers} from "request";

let request = require('request-promise');
let DomParser = require('xmldom').DOMParser;
let logRequest = getLogger('requests');

/**
 * HTTP parameters configuration for CSW harvesters.
 */
export interface CswParameters {
    readonly request: 'GetRecords', // Only value currently being used. Needs to be extended, if required
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

/**
 * Delegate class for handling HTTP-requests.
 */
export class RequestDelegate {
    private config: OptionsWithUri;
    private readonly postBodyXml: any;
    private paging: RequestPaging;

    /**
     * Create a delegate object for handling HTTP requests
     *
     * @param config configuration to use for the HTTP requests
     * @param paging
     */
    constructor(config: OptionsWithUri, paging?: RequestPaging) {
        this.config = config;
        if (config.body) {
            this.postBodyXml = new DomParser().parseFromString(config.body, 'application/xml');
        }

        this.paging = paging;
    }

    /**
     * Returns the default HTTP headers that can be used for harvesting requests.
     * The headers only consist of the User-Agent set to a value of:
     * "mCLOUD Harvester. Request-Promise"
     */
    static defaultRequestHeaders(): Headers {
        return {
            "User-Agent": "mCLOUD Harvester. Request-Promise"
        };
    }

    /**
     * Returns the default HTTP request headers that can be used for CSW
     * harvesting requests. The headers that are set are:
     * - User-Agent: mCLOUD Harvester. Request-Promise
     * - Content-Type: text/xml
     */
    static cswRequestHeaders(): Headers {
        return {
            'User-Agent': 'mCLOUD Harvester. Request-Promise',
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
        this.config = {...this.config, ...partialConfig};
    }

    /**
     * Performs the HTTP request and returns the result of this operation. If
     * the optional callback is provided, then it too if forwarded to the
     * request.
     *
     * @param callback optional callback for the request library
     */
    async doRequest(callback?: (error: any, response: any) => boolean): Promise<any> {

        logRequest.debug('Requesting: ' + this.config.uri);
        if (callback) {
            return request(this.config, callback);
        } else {
            return request(this.config);
        }

    }
}

