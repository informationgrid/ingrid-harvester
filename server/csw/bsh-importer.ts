import {CswSettings, CswUtils} from "./csw-utils";
import {Importer} from "../importer";
import {Summary} from "../model/summary";
import {RequestDelegate} from "../utils/http-request-utils";

export class BshImporter implements Importer {

    private readonly cswUtil: CswUtils;

    constructor(settings: CswSettings) {

        let requestConfig = CswUtils.createRequestConfig(settings);

        let requestDelegate: RequestDelegate = new RequestDelegate(requestConfig, CswUtils.createPaging(settings));
        this.cswUtil = new CswUtils(settings, requestDelegate);
    }

    async run(): Promise<Summary> {
        return this.cswUtil.run();
    }

}

