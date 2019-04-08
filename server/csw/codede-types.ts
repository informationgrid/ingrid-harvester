import {Summary} from "../model/summary";
import {Importer} from "../importer";
import {CswMapper} from "./csw-mapper";
import {CswParameters, RequestConfig, RequestDelegate} from "../utils/http-request-utils";
import {CswUtils} from "./csw-utils";

export class CodeDeUtils extends CswUtils {

    getMapper(settings, record, harvestTime, issuedTime, summary): CswMapper {
        return new CodeDeMapper(settings, record, harvestTime, issuedTime, summary);
    }
}

export class CodeDeMapper extends CswMapper {

    private readonly mySettings: any;

    constructor(settings, record, harvestTime, issued, summary) {
        super(settings, record, harvestTime, issued, summary);
        this.mySettings = settings;
    }

    getKeywords(mandatoryKws: string[] = ['opendata']): string[] {
        return super.getKeywords([
            'opendata',
            'inspireidentifiziert'
        ]);
    }

    getMetadataSource(): any {
        let uuid = this.getUuid();
        let cswLink = this.mySettings.getRecordsUrlFor(uuid);
        let portalLink = `https://code-de.org/de/record/${uuid}`;

        return {
            raw_data_source: cswLink,
            portal_link: portalLink,
            attribution: this.mySettings.defaultAttribution
        };
    }
}

export class CodeDeImporter implements Importer {

    public dwdUtil: CodeDeUtils;

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
            constraint: '<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc"><ogc:PropertyIsEqualTo><ogc:PropertyName>HasSecurityConstraints</ogc:PropertyName><ogc:Literal>false</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>'
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
        this.dwdUtil = new CodeDeUtils(settings, requestDelegate);
    }

    async run(): Promise<Summary> {
        return this.dwdUtil.run();
    }
}

