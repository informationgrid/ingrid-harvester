import {CswUtils} from "./csw-utils";
import {CswMapper} from "./csw-mapper";
import {Summary} from "../model/summary";
import {Importer} from "../importer";

export class DwdImporter implements Importer {

    private cswUtil: CswUtils;

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
                maxRecords: 50
            },
            headers: {
                'User-Agent': 'mCLOUD Harvester. Request-Promise',
                'Content-Type': 'text/xml'
            },
            json: false
        };
        this.cswUtil = new CswUtils(settings);
    }

    async run(): Promise<Summary> {
        return this.cswUtil.run();
    }
}
