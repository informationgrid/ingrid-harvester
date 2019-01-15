import {CswUtils} from './csw-utils';
import {CswMapper} from "./csw-mapper";

export class BfgImporter {

    cswUtil: CswUtils;

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
                maxRecords: 50,
                constraint: '<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc"><ogc:PropertyIsLike escapeChar="!" singleChar="?" wildCard="*"><ogc:PropertyName>apiso:AnyText</ogc:PropertyName><ogc:Literal>opendata</ogc:Literal></ogc:PropertyIsLike></ogc:Filter>'
            },
            headers: {
                'User-Agent': 'mCLOUD Harvester. Request-Promise',
                'Content-Type': 'text/xml'
            },
            json: false
        };
        this.cswUtil = new CswUtils(settings);
    }

    async run() {
        this.cswUtil.run();
    }
}
