import {Summary} from "./model/summary";

export type ImporterSettings = {
    type, proxy?, dryRun?, disable?
}

export interface Importer {
    run: () => Promise<Summary>
}
