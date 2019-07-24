import {ElasticSettings} from '../../utils/elastic.setting';
import {ImporterSettings} from '../../importer.settings';

export type CswSettings = {
    getRecordsUrl: string,
    eitherKeywords: string[],
    httpMethod: "GET" | "POST",
    recordFilter?: string
} & ElasticSettings & ImporterSettings;
