import {ElasticSettings} from '../../utils/elastic.setting';
import {ImporterSettings} from '../../importer.settings';
import {License} from '../../model/generic.mapper';

export type CkanSettings = {
    ckanBaseUrl: string,
    filterTags?: string[],
    filterGroups?: string[],
    requestType?: 'ListWithResources' | 'Search',
    markdownAsDescription?: boolean,
    defaultLicense?: License;
} & ElasticSettings & ImporterSettings;
