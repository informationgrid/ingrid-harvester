import {Authenticated, Controller, Get, PathParams} from '@tsed/common';
import {IndexService} from '../services/IndexService';

@Controller("/api/search")
@Authenticated()
export class SearchCtrl {

    constructor(private indexService: IndexService) {
    }

    @Get("/:indexName")
    async getHarvesterConfig(@PathParams('indexName') indexName: string): Promise<any[]> {
        return this.indexService.search(indexName);
    }
}
