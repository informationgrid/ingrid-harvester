/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or – as soon they will be
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
import { ElasticSearchUtils6 } from './elastic.utils.6';
import { ElasticSearchUtils8 } from './elastic.utils.8';
import { ElasticSettings } from './elastic.setting';
import { Summary } from '../model/summary';
import {ProfileFactory} from "../profiles/profile.factory";

export class ElasticSearchFactory {

    public static getElasticUtils(profile: ProfileFactory<any>, settings: ElasticSettings, summary: Summary): ElasticSearchUtils {
        switch (settings.elasticSearchVersion) {
            case '6':
                return new ElasticSearchUtils6(profile, settings, summary);
            case '7':
                break;
            case '8':
                return new ElasticSearchUtils8(profile, settings, summary);
            default: 
                throw new Error('Only ES versions 6 and 8 are supported; [' + settings.elasticSearchVersion + '] was specified');
        }
    }
}
