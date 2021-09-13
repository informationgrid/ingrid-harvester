/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  http://ec.europa.eu/idabc/eupl5
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

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
    groupChilds?: boolean,
    defaultLicense?: License;
} & ElasticSettings & ImporterSettings;
