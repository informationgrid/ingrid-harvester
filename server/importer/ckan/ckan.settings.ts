import {ElasticSettings} from '../../utils/elastic.utils';
import {ImporterSettings} from '../../importer';

export type CkanSettings = {
    ckanBaseUrl: string,
    filterTags?: string[],
    filterGroups?: string[],
    requestType?: 'ListWithResources' | 'Search',
    markdownAsDescription?: boolean
} & ElasticSettings & ImporterSettings;
