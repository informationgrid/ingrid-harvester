import {CswMapper} from "./csw-mapper";
import {CswUtils} from "./csw-utils";
import {Importer} from "../importer";
import {Summary} from "../model/summary";
import {CswParameters, RequestConfig, RequestDelegate} from "../utils/http-request-utils";

export class BshMapper extends CswMapper {

    constructor(settings, record, harvestTime, issued, summary) {
        super(settings, record, harvestTime, issued, summary);
    }

    getKeywords(mandatoryKws: string[] = ['opendata']): string[] {
        return super.getKeywords([
            'opendata',
            'inspireidentifiziert'
        ]);
    }
}

export class BshUtils extends CswUtils {

    getMapper(settings, record, harvestTime, issuedTime, summary): CswMapper {
        return new BshMapper(settings, record, harvestTime, issuedTime, summary);
    }
}

export class BshImporter implements Importer {
    private readonly bshUtils: BshUtils;

    constructor(settings) {
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
            elementSetName: 'full'
        };

        let requestConfig: RequestConfig = {
            method: method,
            uri: settings.getRecordsUrl,
            json: false,
            headers: RequestDelegate.cswRequestHeaders(),
            qs: parameters,
            body: BshImporter._getGetRecordsXmlBody()
        };
        if (settings.proxy) {
            requestConfig.proxy = settings.proxy;
        }

        let requestDelegate: RequestDelegate = new RequestDelegate(requestConfig);
        this.bshUtils = new BshUtils(settings, requestDelegate);
    }

    async run(): Promise<Summary> {
        return this.bshUtils.run();
    }

    private static _getGetRecordsXmlBody() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<GetRecords xmlns="http://www.opengis.net/cat/csw/2.0.2"
            xmlns:gmd="http://www.isotc211.org/2005/gmd"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xmlns:ogc="http://www.opengis.net/ogc"
            xsi:schemaLocation="http://www.opengis.net/cat/csw/2.0.2"

            service="CSW"
            version="2.0.2"
            resultType="results"
            outputFormat="application/xml"
            outputSchema="http://www.isotc211.org/2005/gmd"
            startPosition="1"
            maxRecords="25">
    <Query typeNames="gmd:MD_Metadata">
        <ElementSetName typeNames="">full</ElementSetName>
        <Constraint version="1.1.0">
            <ogc:Filter>
                <ogc:PropertyIsEqualTo>
                    <ogc:PropertyName>subject</ogc:PropertyName>
                    <ogc:Literal>inspireidentifiziert</ogc:Literal>
                </ogc:PropertyIsEqualTo>
            </ogc:Filter>
        </Constraint>
    </Query>
</GetRecords>`;
    }
}

