import {ElasticSettings} from '../../utils/elastic.setting';
import {ImporterSettings} from '../../importer.settings';
import {License} from '@shared/license.model';

export type CkanSettings = {
    ckanBaseUrl: string,
    filterTags?: string[],
    filterGroups?: string[],
    requestType?: 'ListWithResources' | 'Search',
    markdownAsDescription?: boolean,
    defaultLicense?: License;
} & ElasticSettings & ImporterSettings;
