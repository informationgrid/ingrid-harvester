import {Summary} from "../model/summary";
import {Importer} from "../importer";
import {DwdUtils} from "./dwd-utils";
import {CswMapper} from "./csw-mapper";

export class DwdImporter implements Importer {

    public dwdUtil: DwdUtils;

    constructor(settings) {
        let gmdEncoded = encodeURIComponent(CswMapper.GMD);
        settings.getRecordsUrlFor = function(uuid) {
            return `${settings.getRecordsUrl}?REQUEST=GetRecordById&SERVICE=CSW&VERSION=2.0.2&ElementSetName=full&outputFormat=application/xml&outputSchema=${gmdEncoded}&Id=${uuid}`;
        };

        let method = "GET";
        if (settings.httpMethod) {
            method = settings.httpMethod;
        }
        settings.options_csw_search = {
            method: method,
            uri: settings.getRecordsUrl,
            qs: {
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
                constraint_language_version: '1.1.0',
                elementSetName: 'full',
                constraint: '<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc"><ogc:PropertyIsEqualTo><ogc:PropertyName>subject</ogc:PropertyName><ogc:Literal>inspireidentifiziert</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>'
            },
            headers: {
                'User-Agent': 'mCLOUD Harvester. Request-Promise',
                'Content-Type': 'text/xml'
            },
            json: false
        };
        this.dwdUtil = new DwdUtils(settings);
    }

    async run(): Promise<Summary> {
        return this.dwdUtil.run();
    }
}
