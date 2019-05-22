import {Summary} from "../model/summary";
import {Importer} from "../importer";
import {RequestDelegate} from "../utils/http-request.utils";
import {CswImporter} from "./csw.importer";

export class DwdImporter implements Importer {

    public cswUtil: CswImporter;

    constructor(settings) {
        let requestConfig = CswImporter.createRequestConfig(settings);

        let requestDelegate: RequestDelegate = new RequestDelegate(requestConfig, CswImporter.createPaging(settings));
        this.cswUtil = new CswImporter(settings, requestDelegate);
    }

    async run(): Promise<Summary> {
        return this.cswUtil.run();
    }
}
