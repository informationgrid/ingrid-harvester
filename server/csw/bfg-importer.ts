import {CswMapper} from "./csw-mapper";
import {Summary} from "../model/summary";
import {Importer} from "../importer";
import {BfgUtils} from "./bfg-types";
import {CswParameters, RequestConfig, RequestDelegate} from "../utils/http-request-utils";

export class BfgImporter implements Importer {

    bfgUtil: BfgUtils;

    constructor(settings, overrideCswParameters?) {
        let gmdEncoded = encodeURIComponent(CswMapper.GMD);
        settings.getRecordsUrlFor = function (uuid) {
            return `${settings.getRecordsUrl}?REQUEST=GetRecordById&SERVICE=CSW&VERSION=2.0.2&ElementSetName=full&outputSchema=${gmdEncoded}&Id=${uuid}`;
        };

        let method: "GET" | "POST" = "GET";
        if (settings.httpMethod) {
            method = settings.httpMethod;
        }

        let parameters: CswParameters = {
            request: "GetRecords",
            SERVICE: "CSW",
            VERSION: "2.0.2",
            elementSetName: "full",
            resultType: "results",
            outputFormat: "application/xml",
            outputSchema: "http://www.isotc211.org/2005/gmd",
            typeNames: 'gmd:MD_Metadata',
            CONSTRAINTLANGUAGE: 'FILTER',
            CONSTRAINT_LANGUAGE_VERSION: '1.1.0',
            startPosition: 1,
            maxRecords: 25,
            constraint: `
                <ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">
                    <ogc:PropertyIsEqualTo>
                        <ogc:PropertyName>subject</ogc:PropertyName>
                        <ogc:Literal>opendata</ogc:Literal>
                    </ogc:PropertyIsEqualTo>
                </ogc:Filter>`
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
        this.bfgUtil = new BfgUtils(settings, requestDelegate);
    }

    async run(): Promise<Summary> {
        return this.bfgUtil.run();
    }
}

