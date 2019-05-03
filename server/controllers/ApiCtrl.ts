import {Authenticated, Controller, Get} from "@tsed/common";

@Controller("/api")
export class ApiCtrl {

    @Get("/config")
    @Authenticated()
    async getConfig(): Promise<any> {
        return [{id: '1', name: "test12"}];
    }
}
