/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {ImporterSettings} from "../importer.settings";

let log = require('log4js').getLogger( __filename );

export class FilterUtils {


    constructor(private settings: ImporterSettings) {
    }

    isIdAllowed(id: string) {
        if (this.settings.blacklistedIds) {
            const isWhitelisted = this.settings.whitelistedIds.indexOf(id) !== -1;
            const isBlacklisted = this.settings.blacklistedIds.indexOf(id) !== -1;
            const isAllowed = isWhitelisted || !isBlacklisted;

            if (isBlacklisted) {
                if (isWhitelisted) {
                    log.info(`Document is whitelisted and not skipped because of blacklisting: ${id}`);
                } else {
                    log.info(`Document is not allowed since blacklisted: ${id}`);
                }
            }

            return isAllowed;
        }
        return true;
    }

    /**
     * Check if a dataset has at least one of the defined tags/groups. If no tag/group has been
     * defined, then the dataset also will be used.
     *
     * @param dataset is the dataset to be checked
     * @param field defines if we want to check for tags or groups
     * @param filteredItems are the tags/groups to be checked against the dataset
     */
    hasValidTagsOrGroups(dataset: any, field: 'tags' | 'groups', filteredItems: string[]) {
        if (filteredItems.length === 0 || (!dataset[field] && filteredItems.length === 0)) return true;

        const hasValidContent = dataset[field] && dataset[field].some(field => filteredItems.includes(field.name));
        const isWhitelisted = this.settings.whitelistedIds.indexOf(dataset.id) !== -1;

        if (!hasValidContent && isWhitelisted) {
            log.info(`Document is whitelisted and not skipped, although no valid tag/group: ${dataset.id}`);
            return true;
        }

        return hasValidContent;
    }

}