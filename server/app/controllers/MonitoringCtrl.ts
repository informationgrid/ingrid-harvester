/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  http://ec.europa.eu/idabc/eupl5
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Authenticated, BodyParams, Controller, Delete, Get, PathParams} from '@tsed/common';
import {IndexService} from '../services/IndexService';
import {Index} from '@shared/index.model';
import {UrlCheckService} from "../services/statistic/UrlCheckService";
import {ScheduleService} from "../services/ScheduleService";
import {HistoryService} from "../services/statistic/HistoryService";
import {IndexCheckService} from "../services/statistic/IndexCheckService";

@Controller('/api/monitoring')
@Authenticated()
export class MonitoringCtrl {

    constructor(private urlCheckService: UrlCheckService,
                private indexCheckService: IndexCheckService,
                private historyService: HistoryService) {
    }



    @Get('/urlcheck')
    async getUrlCheckHistory(): Promise<any> {
        return this.urlCheckService.getHistory()
    }

    @Get('/indexcheck')
    async getIndexCheckHistory(): Promise<any> {
        return this.indexCheckService.getHistory()
    }

    @Get('/harvester')
    getAllHarvesterHistory(@BodyParams() request: any) {
        return this.historyService.getHistoryAll();
    }

}
