import {CswUtils} from "./csw-utils";
import {DwdMapper} from "./dwd-mapper";
import {CswMapper} from "./csw-mapper";

export class DwdUtils extends CswUtils {


    getMapper(settings, record, harvestTime, issuedTime, summary): CswMapper {
        return new DwdMapper(settings, record, harvestTime, issuedTime, summary);
    }
}
