import {ElasticSettings} from '../../utils/elastic.setting';
import {ImporterSettings} from '../../importer.settings';

export type DCATProviderField = 'contactPoint' | 'creator' | 'originator' | 'maintainer';

export type DcatSettings = {
    catalogUrl: string,
    filterTags?: string[],
    filterThemes?: string[],
    providerPrefix?: string,
    dcatProviderField?: DCATProviderField,
} & ElasticSettings & ImporterSettings;
