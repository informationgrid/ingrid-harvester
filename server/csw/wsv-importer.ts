import {CswUtils} from "./csw-utils";
import {Summary} from "../model/summary";
import {Importer} from "../importer";
import {RequestDelegate} from "../utils/http-request-utils";

export class WsvImporter implements Importer {

    private cswUtil: CswUtils;

    constructor(settings) {
        let requestConfig = CswUtils.createRequestConfig(settings);

        let requestDelegate: RequestDelegate = new RequestDelegate(requestConfig, CswUtils.createPaging(settings));
        this.cswUtil = new CswUtils(settings, requestDelegate);
    }

    async run(): Promise<Summary> {
        return this.cswUtil.run();
    }

}
