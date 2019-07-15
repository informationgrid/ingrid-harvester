import {ElasticSettings} from '../../utils/elastic.utils';
import {ImporterSettings} from '../../importer';

export type CswSettings = {
    getRecordsUrl: string,
    eitherKeywords: string[],
    httpMethod: "GET" | "POST",
    recordFilter?: string
} & ElasticSettings & ImporterSettings;
