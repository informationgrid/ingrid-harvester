import {ElasticSettings} from '../../utils/elastic.setting';
import {ImporterSettings} from '../../importer.settings';

export type CkanSettings = {
    ckanBaseUrl: string,
    filterTags?: string[],
    filterGroups?: string[],
    requestType?: 'ListWithResources' | 'Search',
    markdownAsDescription?: boolean
} & ElasticSettings & ImporterSettings;
