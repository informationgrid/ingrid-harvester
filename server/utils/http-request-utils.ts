let request = require('request-promise');
let DomParser = require('xmldom').DOMParser;

/**
 * HTTP-Headers to set for outgoing HTTP requests.
 */
export interface RequestHeaders {
    readonly 'User-Agent': 'mCLOUD Harvester. Request-Promise',
    readonly 'Content-Type'?: string
}

/**
 * Configuration to be used for HTTP requests. This configuration will be used
 * as-is with the request library, so the object keys are the same as those
 * used by this library.
 */
export interface RequestConfig {
    readonly method: 'GET' | 'POST',
    readonly json: boolean,
    readonly headers: RequestHeaders
    readonly qs: RequestParameters,

    uri: string,
    body?: string,
    proxy?: string
}

/**
 * HTTP parameters configuration for CSW harvesters.
 */
export interface CswParameters {
    readonly request?: 'GetRecords', // Only value currently being used. Needs to be extended, if required
    readonly REQUEST?: 'GetRecords', // Only value currently being used. Needs to be extended, if required
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
    rows?: number
}

type RequestParameters = CswParameters | CkanParameters;

/**
 * Delegate class for handling HTTP-requests.
 */
export class RequestDelegate {
    private readonly config: RequestConfig;
    private readonly maxRecordCount;
    private readonly postBodyXml: any;

    /**
     * Create a delegate object for handling HTTP requests
     *
     * @param config configuration to use for the HTTP requests
     */
    constructor(config: RequestConfig) {
        this.config = config;
        if (config.body) {
            this.postBodyXml = new DomParser().parseFromString(config.body, 'application/xml');
        }

        let parameters: RequestParameters = config.qs;
        if (parameters.hasOwnProperty('maxRecords')) {
            this.maxRecordCount = (<CswParameters>parameters).maxRecords;
        } else if (parameters.hasOwnProperty('rows')) {
            this.maxRecordCount = (<CkanParameters>parameters).rows;
        }
    }

    /**
     * Returns the default HTTP headers that can be used for harvesting requests.
     * The headers only consist of the User-Agent set to a value of:
     * "mCLOUD Harvester. Request-Promise"
     */
    static defaultRequestHeaders(): RequestHeaders {
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
    static cswRequestHeaders(): RequestHeaders {
        return {
            'User-Agent': 'mCLOUD Harvester. Request-Promise',
            'Content-Type': 'text/xml'
        };
    }

    /**
     * Returns the starting index for the next batch of records to be harvested
     * from the upstream server.
     *
     * @return the starting index for the next batch of records to be harvested
     */
    getStartRecordIndex(): number {
        let parameters: RequestParameters = this.config.qs;
        if (parameters.hasOwnProperty('startPosition')) {
            return (<CswParameters>parameters).startPosition;
        }
    }

    /**
     * Increments the starting index for the next batch of records to fetch from
     * the upstream server. If the request is a CSW request and consists of an
     * XML body, the starting index will be updated in both the GET parameters
     * and the XML body.
     */
    incrementStartRecordIndex(): void {
        let parameters: RequestParameters = this.config.qs;

        if (parameters.hasOwnProperty('startPosition')) {
            let updated = this.maxRecordCount + (<CswParameters>parameters).startPosition;
            (<CswParameters>parameters).startPosition = updated;
            if (this.postBodyXml) {
                this.postBodyXml.documentElement.setAttribute('startPosition', updated);
                this.config.body = this.postBodyXml.toString();
            }
        } else if (parameters.hasOwnProperty('start')) {
            (<CkanParameters>parameters).start += this.maxRecordCount;
        }
    }

    /**
     * Performs the HTTP request and returns the result of this operation. If
     * the optional callback is provided, then it too if forwarded to the
     * request.
     *
     * @param callback optional callback for the request library
     */
    async doRequest(callback?: (error: any, response: any) => boolean): Promise<any> {
        if (callback) {
            return request(this.config, callback);
        } else {
            return request(this.config);
        }
    }
}

