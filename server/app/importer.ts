import {Observable} from 'rxjs';
import {ImportLogMessage} from './model/import.result';
import {Summary} from './model/summary';
import {ImporterSettings} from './importer.settings';

export const DefaultImporterSettings: ImporterSettings = {
    priority: 0,
    type: '',
    maxRecords: 100,
    startPosition: 0,
    customCode: '',
    defaultMcloudSubgroup: [],
    defaultDCATCategory: [],
    dateSourceFormats: [],
    blacklistedIds: [],
    whitelistedIds: [],
    rejectUnauthorizedSSL: true
};

export interface Importer {
    run: Observable<ImportLogMessage>;

    getSummary(): Summary;
}
