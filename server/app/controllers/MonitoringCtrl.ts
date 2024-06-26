/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

import { AuthMiddleware } from '../middlewares/auth/AuthMiddleware';
import { BodyParams, Controller, Get, UseAuth } from '@tsed/common';
import { HistoryService } from "../services/statistic/HistoryService";
import { IndexCheckService } from "../services/statistic/IndexCheckService";
import { UrlCheckService } from "../services/statistic/UrlCheckService";

@Controller('/api/monitoring')
@UseAuth(AuthMiddleware)
export class MonitoringCtrl {

    constructor(private urlCheckService: UrlCheckService,
                private indexCheckService: IndexCheckService,
                private historyService: HistoryService) {
    }

    @Get('/urlcheck')
    async getUrlCheckHistory(): Promise<any> {
        // re-initialize in case settings have changed
        this.urlCheckService.initialize();
        return this.urlCheckService.getHistory()
    }

    @Get('/indexcheck')
    async getIndexCheckHistory(): Promise<any> {
        // re-initialize in case settings have changed
        this.indexCheckService.initialize();
        return this.indexCheckService.getHistory()
    }

    @Get('/harvester')
    getAllHarvesterHistory(@BodyParams() request: any) {
        // re-initialize in case settings have changed
        this.historyService.initialize();
        return this.historyService.getHistoryAll();
    }
}
