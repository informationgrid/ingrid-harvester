/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Authenticated, BodyParams, Controller, Delete, Get, PathParams, Post} from '@tsed/common';
import {IndexService} from '../services/IndexService';
import {Index} from '@shared/index.model';
import {ConfigService} from "../services/config/ConfigService";

@Controller('/api/indices')
@Authenticated()
export class IndicesCtrl {

    constructor(private indexService: IndexService) {
        indexService.initialize();
    }

    @Get('/')
    async getIndices(): Promise<Index[]> {
        return await this.indexService.getIndices();

    }

    @Delete('/:name')
    async deleteIndex(@PathParams('name') name: string): Promise<void> {
        return this.indexService.deleteIndex(name);
    }

    @Get('/:name')
    async exportIndex(@PathParams('name') name: string): Promise<any> {
        return await this.indexService.exportIndex(name);
    }

    @Post('/')
    async importMappingFile(@BodyParams() file: any): Promise<void> {
        if(file.index && file.settings && file.mappings && file.data)
            await this.indexService.importIndex(file);
    }
}
