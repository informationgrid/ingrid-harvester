import {Observable} from 'rxjs';
import {ImportLogMessage} from './model/import.result';
import {Summary} from './model/summary';
import {ImporterSettings} from './importer.settings';

export const DefaultImporterSettings: ImporterSettings = {
    type: '',
    maxRecords: 100,
    startPosition: 0,
    defaultMcloudSubgroup: [],
    defaultDCATCategory: [],
    dateSourceFormats: [],
    blacklistedIds: [],
    whitelistedIds: []
};

export interface Importer {
    run: Observable<ImportLogMessage>;

    getSummary(): Summary;
}
