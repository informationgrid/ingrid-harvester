import {Observable} from 'rxjs';
import {ImportLogMessage} from './model/import.result';
import {Summary} from './model/summary';

export type ImporterSettings = {
    id?: number, description?: string, type: string, proxy?: string, dryRun?: boolean, disable?: boolean,
    maxRecords?: number,
    startPosition?: number,
    defaultMcloudSubgroup?: string[],
    defaultDCATCategory?: string[],
    defaultAttribution?: string,
    defaultAttributionLink?: string,
    cronPattern?: string
}

export const DefaultImporterSettings: ImporterSettings = {
    type: '',
    maxRecords: 100,
    startPosition: 0
};

export interface Importer {
    run: Observable<ImportLogMessage>;

    getSummary(): Summary;
}
