import {Authenticated, BodyParams, Controller, Delete, Get, PathParams} from '@tsed/common';
import {IndexService} from '../services/IndexService';
import {Index} from '@shared/index.model';
import {UrlCheckService} from "../services/statistic/UrlCheckService";
import {ScheduleService} from "../services/ScheduleService";
import {HistoryService} from "../services/statistic/HistoryService";

@Controller('/api/monitoring')
@Authenticated()
export class MonitoringCtrl {

    constructor(private urlCheckService: UrlCheckService,
                private historyService: HistoryService) {
    }



    @Get('/urlcheck')
    async getUrlCheckHistory(): Promise<any> {
        return this.urlCheckService.getHistory()
    }


    @Get('/harvester')
    getAllHarvesterHistory(@BodyParams() request: any) {
        return this.historyService.getHistoryAll();
    }

}
