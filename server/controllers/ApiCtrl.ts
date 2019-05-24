import {Authenticated, Controller, Get} from "@tsed/common";
import {Harvester} from "../../client/src/app/harvester/model/harvester";

@Controller("/api")
export class ApiCtrl {

    @Get("/harvester")
    @Authenticated()
    async getHarvesterConfig(): Promise<Harvester[]> {
        return [{
            "type": "EXCEL",
            "elasticSearchUrl": "http://localhost:9200",
            "index": "excel",
            "indexType": "base",
            "alias": "mcloud",
            "filePath": "./data.xlsx",
            "includeTimestamp": true,
            "defaultDCATCategory": "TRAN"
        }];
    }
}
