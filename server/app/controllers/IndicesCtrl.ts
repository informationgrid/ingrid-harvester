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

        return this.indexService.getIndices();

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
