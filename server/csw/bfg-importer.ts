import {CswMapper} from "./csw-mapper";
import {Summary} from "../model/summary";
import {Importer} from "../importer";
import {BfgUtils} from "./bfg-types";

export class BfgImporter implements Importer {

    bfgUtil: BfgUtils;

    constructor(settings) {
        let gmdEncoded = encodeURIComponent(CswMapper.GMD);
        settings.getRecordsUrlFor = function(uuid) {
            return `${settings.getRecordsUrl}?REQUEST=GetRecordById&SERVICE=CSW&VERSION=2.0.2&ElementSetName=full&outputSchema=${gmdEncoded}&Id=${uuid}`;
        };
        // TODO: settings.getGetRecordsPostBody = this._getGetRecordsXmlBody;

        let method = "GET";
        if (settings.httpMethod) {
            method = settings.httpMethod;
        }
        settings.options_csw_search = {
            method: method,
            uri: settings.getRecordsUrl,
            qs: {
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
                constraint: '<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc"><ogc:PropertyIsEqualTo><ogc:PropertyName>subject</ogc:PropertyName><ogc:Literal>opendata</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>'
            },
            headers: {
                'User-Agent': 'mCLOUD Harvester. Request-Promise',
                'Content-Type': 'text/xml'
            },
            json: false
        };
        this.bfgUtil = new BfgUtils(settings);
    }

    async run(): Promise<Summary> {
        return this.bfgUtil.run();
    }
}

