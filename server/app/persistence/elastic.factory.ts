/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
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

import type { ElasticsearchConfiguration } from '@shared/general-config.settings.js';
import log4js from 'log4js';
import type { Summary } from '../model/summary.js';
import { ElasticsearchUtils8 } from './elastic.utils.8.js';
import { ElasticsearchUtils9 } from "./elastic.utils.9.js";
import type { ElasticsearchUtils } from './elastic.utils.js';

const log = log4js.getLogger(import.meta.filename);

export class ElasticsearchFactory {

    private static instances: Map<string, ElasticsearchUtils> = new Map();

    public static getElasticUtils(config: ElasticsearchConfiguration, summary: Summary): ElasticsearchUtils {
        const cacheKey = `${config.url}_${config.version}_${config.user}_${config.index}`;

        let instance = this.instances.get(cacheKey);
        if (instance) {
            if (instance.isAlive()) {
                log.debug(`Reusing existing ES client for ${config.url} (${config.version}/${config.user}/${config.index})`);
                return this.instances.get(cacheKey)!;
            }
            else {
                // close, but don't wait
                log.warn(`Existing ES client for ${config.url} (${config.version}/${config.user}/${config.index}) is not alive anymore, creating new instance`);
                instance.close();
            }
        }
        log.debug(`Creating new ES client for ${config.url} (${config.version}/${config.user}/${config.index})`);

        switch (String(config.version)) {
            case '8':
                instance = new ElasticsearchUtils8(config, summary);
                break;
            case '9':
                instance = new ElasticsearchUtils9(config, summary);
                break;
            default:
                throw new Error(`Only ES versions 8 and 9 are supported`);
        }
        this.instances.set(cacheKey, instance);
        return instance;
    }
}
