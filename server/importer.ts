import {Summary} from "./model/summary";

export interface Importer {
    run: () => Promise<Summary>
}
