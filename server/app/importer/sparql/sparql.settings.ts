import {ElasticSettings} from '../../utils/elastic.setting';
import {ImporterSettings} from '../../importer.settings';

export type SparqlSettings = {
    endpointUrl: string,
    query: string,
    filterTags?: string[],
    filterThemes?: string[],
    defaultProvider?: string,
    eitherKeywords?: string[],
    recordFilter?: string
} & ElasticSettings & ImporterSettings;
