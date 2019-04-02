import {CswMapper} from "./csw-mapper";

export class DwdMapper extends CswMapper {

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
