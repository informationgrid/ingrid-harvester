import {CswMapper} from "./csw.mapper";
import {CswImporter} from "./csw.importer";

export class CodeDeMapper extends CswMapper {

    private readonly mySettings: any;

    constructor(settings, record, harvestTime, issued, summary) {
        super(settings, record, harvestTime, issued, summary);
        this.mySettings = settings;
    }

    getMetadataSource(): any {
        let uuid = this.getUuid();
        let gmdEncoded = encodeURIComponent(CswMapper.GMD);
        let cswLink = `${this.mySettings.getRecordsUrl}?REQUEST=GetRecordById&SERVICE=CSW&VERSION=2.0.2&ElementSetName=full&outputFormat=application/xml&outputSchema=${gmdEncoded}&Id=${uuid}`;
        let portalLink = `https://code-de.org/de/record/${uuid}`;

        return {
            raw_data_source: cswLink,
            portal_link: portalLink,
            attribution: this.mySettings.defaultAttribution
        };
    }
}


export class CodedeImporter extends CswImporter {

    getMapper(settings, record, harvestTime, issuedTime, summary): CswMapper {
        return new CodeDeMapper(settings, record, harvestTime, issuedTime, summary);
    }

}
