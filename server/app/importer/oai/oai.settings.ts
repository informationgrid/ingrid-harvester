import {ElasticSettings} from '../../utils/elastic.setting';
import {ImporterSettings} from '../../importer.settings';

export type OaiSettings = {
    providerUrl: string,
    set: string,
    eitherKeywords: string[]
} & ElasticSettings & ImporterSettings;
