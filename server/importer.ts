import {Summary} from "./model/summary";

export type ImporterSettings = {
    description?: string, type: string, proxy?: string, dryRun?: boolean, disable?: boolean,
    defaultMcloudSubgroup?: string,
    defaultDCATCategory?: string
}

export interface Importer {
    run: () => Promise<Summary>
}
