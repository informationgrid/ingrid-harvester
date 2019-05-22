import {Summary} from "../model/summary";
import {Importer} from "../importer";
import {BfgUtils} from "./bfg-types";
import {RequestDelegate} from "../utils/http-request-utils";
import {CswUtils} from "./csw-utils";

export class BfgImporter implements Importer {

    bfgUtil: BfgUtils;

    constructor(settings) {
        let requestConfig = CswUtils.createRequestConfig(settings);

        let requestDelegate: RequestDelegate = new RequestDelegate(requestConfig, CswUtils.createPaging(settings));
        this.bfgUtil = new BfgUtils(settings, requestDelegate);
    }

    async run(): Promise<Summary> {
        return this.bfgUtil.run();
    }
}

