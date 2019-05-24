import {Summary} from "./model/summary";

export type ImporterSettings = {
    id?: number, description, type, proxy?, dryRun?, disable?
}

export interface Importer {
    run: () => Promise<Summary>
}
