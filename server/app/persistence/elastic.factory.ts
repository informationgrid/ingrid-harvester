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

import { ElasticsearchUtils } from './elastic.utils';
import { ElasticsearchUtils6 } from './elastic.utils.6';
import { ElasticsearchUtils7 } from './elastic.utils.7';
import { ElasticsearchUtils8 } from './elastic.utils.8';
import { IndexConfiguration } from './elastic.setting';
import { Summary } from '../model/summary';

export class ElasticsearchFactory {

    public static getElasticUtils(config: IndexConfiguration, summary: Summary): ElasticsearchUtils {
        switch (config.version) {
            case '6':
                return new ElasticsearchUtils6(config, summary);
            case '7':
                return new ElasticsearchUtils7(config, summary);
            case '8':
                return new ElasticsearchUtils8(config, summary);
            default: 
                throw new Error('Only ES versions 6 and 8 are supported; [' + config.version + '] was specified');
        }
    }
}
