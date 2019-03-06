import {CswUtils} from "./csw-utils";
import {CswMapper} from "./csw-mapper";
import {Summary} from "../model/summary";
import {Importer} from "../importer";
import {CswParameters, RequestConfig, RequestDelegate} from "../utils/http-request-utils";

export class WsvImporter implements Importer {

    private static readonly START_POSITION = 1;
    private static readonly MAX_RECORDS = 25;

    private cswUtil: CswUtils;

    constructor(settings) {
        let gmdEncoded = encodeURIComponent(CswMapper.GMD);
        settings.getRecordsUrlFor = function(uuid) {
            return `${settings.getRecordsUrl}?REQUEST=GetRecordById&SERVICE=CSW&VERSION=2.0.2&ElementSetName=full&outputSchema=${gmdEncoded}&Id=${uuid}`;
        };
        settings.getGetRecordsPostBody = WsvImporter._getGetRecordsXmlBody;

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
            startPosition: WsvImporter.START_POSITION,
            maxRecords: WsvImporter.MAX_RECORDS
        };

        let requestConfig: RequestConfig = {
            method: method,
            uri: settings.getRecordsUrl,
            json: false,
            headers: RequestDelegate.cswRequestHeaders(),
            qs: parameters,
            body: WsvImporter._getGetRecordsXmlBody()
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

    private static _getGetRecordsXmlBody() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<GetRecords xmlns="http://www.opengis.net/cat/csw/2.0.2"
            xmlns:gmd="http://www.isotc211.org/2005/gmd"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xsi:schemaLocation="http://www.opengis.net/cat/csw/2.0.2"

            service="CSW"
            version="2.0.2"
            resultType="results"
            outputFormat="application/xml"
            outputSchema="http://www.isotc211.org/2005/gmd"
            startPosition="${WsvImporter.START_POSITION}"
            maxRecords="${WsvImporter.MAX_RECORDS}">
    <Query typeNames="gmd:MD_Metadata">
        <ElementSetName typeNames="">full</ElementSetName>
    </Query>
</GetRecords>`;
    }
}
