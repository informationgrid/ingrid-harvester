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
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Observable} from 'rxjs';
import {ImportLogMessage} from './model/import.result';
import {Summary} from './model/summary';
import {ImporterSettings} from './importer.settings';

export const DefaultImporterSettings: ImporterSettings = {
    priority: null,
    type: '',
    maxRecords: 100,
    startPosition: 0,
    customCode: '',
    defaultMcloudSubgroup: [],
    defaultDCATCategory: [],
    dateSourceFormats: [],
    blacklistedIds: [],
    whitelistedIds: [],
    rejectUnauthorizedSSL: true,
    rules: {
            containsDocumentsWithData: false
    },
    isIncremental: false,
    isConcurrent: false
};

export interface Importer {
    run: Observable<ImportLogMessage>;

    getSummary(): Summary;
}
