import {Observable} from 'rxjs';
import {ImportResultValues} from './model/import.result';

export type ImporterSettings = {
    id?: number, description?: string, type: string, proxy?: string, dryRun?: boolean, disable?: boolean,
    maxRecords?: number,
    startPosition?: number,
    defaultMcloudSubgroup?: string,
    defaultDCATCategory?: string
}

export const DefaultImporterSettings: ImporterSettings = {
    type: '',
    maxRecords: 100,
    startPosition: 0
};

export interface Importer {
    run: Observable<ImportResultValues>;
}
