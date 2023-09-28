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

import { ElasticsearchConfiguration } from '@shared/general-config.settings';

export interface IndexConfiguration extends ElasticsearchConfiguration {
    dryRun?: boolean,
    index: string,
    indexType?: string,
    addAlias?: boolean,
    includeTimestamp?: boolean
}

export interface IndexSettings {
    index: {
        analysis: object
    },
    number_of_shards?: number,
    number_of_replicas?: number,
    max_shingle_diff?: number,
    max_ngram_diff?: number
}