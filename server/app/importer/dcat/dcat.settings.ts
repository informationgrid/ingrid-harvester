import {ElasticSettings} from '../../utils/elastic.setting';
import {ImporterSettings} from '../../importer.settings';

export type DcatSettings = {
    catalogUrl: string,
    filterTags?: string[],
    filterThemes?: string[],
    providerPrefix?: string
} & ElasticSettings & ImporterSettings;
