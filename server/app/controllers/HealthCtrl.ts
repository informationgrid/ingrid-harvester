/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import { ConfigService } from '../services/config/ConfigService';
import { ContentType } from '@tsed/schema';
import { Controller, Get } from '@tsed/common';

@Controller('/health')
export class HealthCtrl {

    @Get('/')
    @ContentType('application/json')
    async getHealth(): Promise<Status> {
        let liveness = (await this.getLiveness()).status;
        let readiness = (await this.getReadiness()).status;
        return {
            status: liveness == 'UP' && readiness == 'UP' ? 'UP' : 'DOWN',
            groups: ['liveness', 'readiness']
        };
    }

    @Get('/liveness')
    @ContentType('application/json')
    async getLiveness(): Promise<Status> {
        return {
            status: 'UP'
        };
    }

    @Get('/readiness')
    @ContentType('application/json')
    async getReadiness(): Promise<Status> {
        return {
            status: 'UP'
        };
    }
}

type Status = {
    status: 'UP' | 'DOWN',
    groups?: string[]
}
