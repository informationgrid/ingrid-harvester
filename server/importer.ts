import {Summary} from "./model/summary";

export type ImporterSettings = {
    description?: string, type: string, proxy?: string, dryRun?: boolean, disable?: boolean,
    maxRecords?: number,
    startPosition?: number,
    defaultMcloudSubgroup?: string[],
    defaultDCATCategory?: string[],
    defaultAttribution?: string,
    defaultAttributionLink?: string
}

export const DefaultImporterSettings: ImporterSettings = {
    type: '',
    maxRecords: 100,
    startPosition: 0
};

export interface Importer {
    run: () => Promise<Summary>
}
