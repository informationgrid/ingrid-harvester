import {Summary} from "../model/summary";
import {Importer} from "../importer";
import {CswMapper} from "./csw-mapper";
import {CswParameters, RequestConfig, RequestDelegate} from "../utils/http-request-utils";
import {CswUtils} from "./csw-utils";

export class DwdImporter implements Importer {

    public cswUtil: CswUtils;

    constructor(settings, overrideCswParameters?) {
        let gmdEncoded = encodeURIComponent(CswMapper.GMD);
        settings.getRecordsUrlFor = function(uuid) {
            return `${settings.getRecordsUrl}?REQUEST=GetRecordById&SERVICE=CSW&VERSION=2.0.2&ElementSetName=full&outputFormat=application/xml&outputSchema=${gmdEncoded}&Id=${uuid}`;
        };

        let method: "GET" | "POST" = "GET";
        if (settings.httpMethod) {
            method = settings.httpMethod;
        }

        let parameters: CswParameters = {
            request: 'GetRecords',
            SERVICE: 'CSW',
            VERSION: '2.0.2',
            resultType: 'results',
            outputFormat: 'application/xml',
            outputSchema: 'http://www.isotc211.org/2005/gmd',
            typeNames: 'gmd:MD_Metadata',
            CONSTRAINTLANGUAGE: 'FILTER',
            startPosition: 1,
            maxRecords: 25,
            CONSTRAINT_LANGUAGE_VERSION: '1.1.0',
            elementSetName: 'full',
            constraint: settings.recordFilter
        };

        if (overrideCswParameters) {
            parameters = {...parameters, ...overrideCswParameters};
        }

        let requestConfig: RequestConfig = {
            method: method,
            uri: settings.getRecordsUrl,
            json: false,
            headers: RequestDelegate.cswRequestHeaders(),
            qs: parameters
        };
        if (settings.proxy) {
            requestConfig.proxy = settings.proxy;
        }

        let requestDelegate: RequestDelegate = new RequestDelegate(requestConfig);
        this.cswUtil = new CswUtils(settings, requestDelegate);
    }

    async run(): Promise<Summary> {
        return this.cswUtil.run();
    }
}
