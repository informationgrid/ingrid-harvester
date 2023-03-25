// /*
//  * ==================================================
//  * ingrid-harvester
//  * ==================================================
//  * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
//  * ==================================================
//  * Licensed under the EUPL, Version 1.2 or - as soon they will be
//  * approved by the European Commission - subsequent versions of the
//  * EUPL (the "Licence");
//  *
//  * You may not use this work except in compliance with the Licence.
//  * You may obtain a copy of the Licence at:
//  *
//  * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
//  *
//  * Unless required by applicable law or agreed to in writing, software
//  * distributed under the Licence is distributed on an "AS IS" basis,
//  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  * See the Licence for the specific language governing permissions and
//  * limitations under the Licence.
//  * ==================================================
//  */

// import { Client as Client6 } from 'elasticsearch6';
// import { Client as Client7 } from 'elasticsearch7';
// import { Client as Client8 } from 'elasticsearch8';
// import { ElasticSearchUtils } from './elastic.utils';
// import { ElasticSearchUtils6 } from './_elastic.utils.6';
// import { ElasticSearchUtils7 } from './_elastic.utils.7';
// import { ElasticSearchUtils8 } from './_elastic.utils.8';
// import { ElasticSettings } from './elastic.setting';
// import { Summary } from '../model/summary';

// const supportedEsVersions = ['6', '7', '8'];
// export class ElasticSearchFactory {

//     public static getElasticUtils(settings: ElasticSettings, summary: Summary): ElasticSearchUtils {
//         if (supportedEsVersions.includes(settings.elasticSearchVersion)) {
//             return new ElasticSearchUtils(settings, summary);
//         }
//         else {
//             throw new Error(`Only ES versions ${supportedEsVersions.join(', ')} are supported; [${settings.elasticSearchVersion}] was specified`);
//         }
//     }
// }
