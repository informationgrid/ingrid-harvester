import {Authenticated, Controller, Delete, Get, PathParams} from '@tsed/common';
import {IndexService} from '../services/IndexService';
import {Index} from '@shared/index.model';

@Controller('/api/indices')
@Authenticated()
export class IndicesCtrl {

    constructor(private indexService: IndexService) {
    }

    @Get('/')
    async getIndices(): Promise<Index[]> {

        return this.indexService.getIndices();

    }

    @Delete('/:name')
    async deleteIndex(@PathParams('name') name: string): Promise<void> {

        return this.indexService.deleteIndex(name);

    }

}
