/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

import { ElasticSearchUtils } from './elastic.utils';
import { ElasticSettings } from './elastic.setting';
import { ImporterSettings } from '../importer.settings';
import { Summary } from '../model/summary';

const log = require('log4js').getLogger(__filename);

export abstract class AbstractDeduplicateUtils {

    protected elastic: ElasticSearchUtils;
    protected settings: ElasticSettings & ImporterSettings;
    protected summary: Summary;

    constructor(elasticUtils: ElasticSearchUtils, settings: any, summary: Summary) {
        this.summary = summary;
        this.elastic = elasticUtils;
        this.settings = settings;
    }

    abstract deduplicate(): Promise<void>;

    abstract _deduplicateByTitle(): Promise<void>;

    protected handleError(message: string, error: any): void {
        this.summary.elasticErrors.push(message);
        log.error(message, error);
    }
}
