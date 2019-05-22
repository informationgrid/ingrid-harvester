import {CswSettings, CswImporter} from "./csw.importer";
import {Importer} from "../importer";
import {Summary} from "../model/summary";
import {RequestDelegate} from "../utils/http-request.utils";

export class BshImporter implements Importer {

    private readonly cswUtil: CswImporter;

    constructor(settings: CswSettings) {

        let requestConfig = CswImporter.createRequestConfig(settings);

        let requestDelegate: RequestDelegate = new RequestDelegate(requestConfig, CswImporter.createPaging(settings));
        this.cswUtil = new CswImporter(settings, requestDelegate);
    }

    async run(): Promise<Summary> {
        return this.cswUtil.run();
    }

}

