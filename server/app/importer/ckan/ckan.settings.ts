import {ElasticSettings} from '../../utils/elastic.setting';
import {ImporterSettings} from '../../importer.settings';
import {License} from '@shared/license.model';

export type ProviderField = 'maintainer' | 'organization' | 'author';

export type CkanSettings = {
    ckanBaseUrl: string,
    filterTags?: string[],
    filterGroups?: string[],
    providerPrefix?: string,
    providerField?: ProviderField,
    requestType?: 'ListWithResources' | 'Search',
    additionalSearchFilter?: string,
    markdownAsDescription?: boolean,
    defaultLicense?: License;
} & ElasticSettings & ImporterSettings;
