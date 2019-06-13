import {Summary} from "../model/summary";
import {Importer} from "../importer";
import {BfgUtils} from "./bfg.mapper";
import {RequestDelegate} from "../utils/http-request.utils";
import {CswImporter} from "./csw.importer";

export class BfgImporter implements Importer {

    bfgUtil: BfgUtils;

    constructor(settings) {
        // merge default settings with configured ones
        settings = {...CswImporter.defaultSettings, ...settings};

        let requestConfig = CswImporter.createRequestConfig(settings);

        let requestDelegate: RequestDelegate = new RequestDelegate(requestConfig, CswImporter.createPaging(settings));
        this.bfgUtil = new BfgUtils(settings, requestDelegate);
    }

    async run(): Promise<Summary> {
        return this.bfgUtil.run();
    }
}

