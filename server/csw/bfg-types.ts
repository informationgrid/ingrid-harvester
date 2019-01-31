import {CswMapper} from "./csw-mapper";
import {CswUtils} from "./csw-utils";
import {UrlUtils} from "../utils/url-utils";

export class BfgMapper extends CswMapper {

    constructor(settings, record, harvestTime, issued, summary) {
        super(settings, record, harvestTime, issued, summary);
    }


    async getLicense(idInfo): Promise<any | any> {
        let constraints = CswMapper.select('//gmd:otherConstraints/gco:CharacterString', idInfo);
        for (let i=0; i<constraints.length; i++) {
            try {
                let snippet: GdiLicense = JSON.parse(constraints[i].textContent);
                if (snippet.id && snippet.url) {
                    return {
                        id: snippet.id,
                        text: snippet.name,
                        url: await UrlUtils.urlWithProtocolFor(snippet.url)
                    }
                }
            } catch (ignored) {}
        }
        // If no license found until here, then fall back to superclass implementation
        return super.getLicense(idInfo);
    }
}

export class BfgUtils extends CswUtils {

    getMapper(settings, record, harvestTime, issuedTime, summary): CswMapper {
        return new BfgMapper(settings, record, harvestTime, issuedTime, summary);
    }
}
// private
interface GdiLicense {
    id: string;
    name: string;
    url; string;
    quelle: string;
}

