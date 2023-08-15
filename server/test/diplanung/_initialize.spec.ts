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

import {Summary} from '../../app/model/summary';
import {IndexConfiguration} from '../../app/persistence/elastic.setting';
import { ElasticsearchFactory } from '../../app/persistence/elastic.factory';


describe('Initialize Elasticsearch', function () {
    this.timeout(10000);

    // @ts-ignore
    let config: IndexConfiguration = {
        url: 'http://localhost:9200',
        version: "6",
        //deduplicationAlias: 'test-dedup'
    };

    // @ts-ignore
    let summary: Summary = {
        elasticErrors: []
    };

   let elasticsearchUtils = ElasticsearchFactory.getElasticUtils(config, summary);
    
});
