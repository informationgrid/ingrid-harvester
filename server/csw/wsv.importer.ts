import {CswImporter} from "./csw.importer";
import {Summary} from "../model/summary";
import {Importer} from "../importer";
import {RequestDelegate} from "../utils/http-request.utils";

export class WsvImporter implements Importer {

    private cswUtil: CswImporter;

    constructor(settings) {
        let requestConfig = CswImporter.createRequestConfig(settings);

        let requestDelegate: RequestDelegate = new RequestDelegate(requestConfig, CswImporter.createPaging(settings));
        this.cswUtil = new CswImporter(settings, requestDelegate);
    }

    async run(): Promise<Summary> {
        return this.cswUtil.run();
    }

}
