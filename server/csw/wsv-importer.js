'use-strict';

let CswUtils = require('./csw-utils');

class WsvImporter {
    constructor(settings) {
        let gmdEncoded = encodeURIComponent(CswUtils.GMD);
        settings.getRecordsUrlFor = function(uuid) {
            return `${settings.getRecordsUrl}?REQUEST=GetRecordById&SERVICE=CSW&VERSION=2.0.2&ElementSetName=full&outputSchema=${gmdEncoded}&Id=${uuid}`;
        };
        settings.getGetRecordsPostBody = this._getGetRecordsXmlBody;

        let method = "GET";
        if (settings.httpMethod) {
            method = settings.httpMethod;
        }
        settings.options_csw_search = {
            method: method,
            uri: settings.getRecordsUrl,
            qs: {
                REQUEST: "GetRecords",
                SERVICE: "CSW",
                VERSION: "2.0.2",
                elementSetName: "full",
                resultType: "results",
                outputFormat: "application/xml",
                outputSchema: "http://www.isotc211.org/2005/gmd",
                startPosition: 1,
                maxRecords: 25
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

    _getGetRecordsXmlBody() {
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
            startPosition="1"
            maxRecords="10">
    <Query typeNames="gmd:MD_Metadata">
        <ElementSetName typeNames="">full</ElementSetName>
    </Query>
</GetRecords>`;
    }
}

module.exports = WsvImporter;
