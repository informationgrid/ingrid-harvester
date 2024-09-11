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

import {Summary} from '../../app/model/summary';
import {expect} from "chai";
import {configure} from 'log4js';
import {doc1, doc3, doc4} from '../data/docs.deduplication';
import {indexMappings} from '../../app/profiles/mcloud/elastic/elastic.mappings';
import {indexSettings} from '../../app/profiles/mcloud/elastic/elastic.settings';
import { ElasticsearchFactory } from '../../app/persistence/elastic.factory';
import { IndexConfiguration } from '../../app/persistence/elastic.setting';
import {ProfileFactoryLoader} from "../../app/profiles/profile.factory.loader";
import {mcloudFactory} from "../../app/profiles/mcloud/profile.factory";
import {DeduplicateUtils} from "../../app/profiles/mcloud/elastic/deduplicate.utils";

configure('./test/log4js-test.json');

require('url').URL;

xdescribe('deduplication by similar title', function () {
    this.timeout(10000);

    // @ts-ignore
    let config: IndexConfiguration = {
        url: 'http://localhost:9200',
        version: "6"
    };

    let deduplicationIndices = ['test-deduplicate1', 'test-deduplicate2'];

    // @ts-ignore
    let summary: Summary = {
        elasticErrors: []
    };

    let elasticsearchUtils = ElasticsearchFactory.getElasticUtils(config, summary);
    let deduplicateUtils: DeduplicateUtils = (new mcloudFactory()).getDeduplicationUtils(elasticsearchUtils, summary);
    //deduplicateUtils.deduplicationIndices = deduplicationIndices;

    /**
     * Initialize test indices with mapping and settings
     */
    before(async function () {
        // TODO this is missing "ignore: [404]"
        await elasticsearchUtils.deleteIndex(
            deduplicationIndices
        );
        await flush();
        elasticsearchUtils.indexName = deduplicationIndices[0];
        await elasticsearchUtils.prepareIndex(indexMappings, indexSettings);
        elasticsearchUtils.indexName = deduplicationIndices[1];
        await elasticsearchUtils.prepareIndex(indexMappings, indexSettings);
        await flush();
    });

    /**
     * Remove all documents from used indices (faster than re-initializing)
     */
    beforeEach(async function () {
        await deduplicationIndices.forEach(async (index) => {
            let searchResponse = await elasticsearchUtils.search(
                index
            );
            await searchResponse.hits.hits.forEach(async (hit) =>
                await elasticsearchUtils.deleteDocument(
                    index,
                    hit._index
                ));
            await flush();
        });
    });

    xit('should remove document by similar title', async function () {
        // add same document to two different indices
        await index(doc1, doc3);
        await index(null, doc4);

        // deduplicate
        // deduplicateUtils._queueForDuplicateSearch(doc1, 'xxx');
        // await deduplicateUtils._deduplicateUsingQuery();

        // check only one document exists
        await flush();
        let searchResponse = await elasticsearchUtils.search(deduplicationIndices);
        expect(searchResponse.hits.total).to.be.equal(1);
    });

    /**
     * Index doc1 into first deduplication index and doc2 into the second one
     * @param doc1
     * @param doc2
     */
    async function index(doc1, doc2) {
        if (doc1) await elasticsearchUtils.index(deduplicationIndices[0], doc1);
        if (doc2) await elasticsearchUtils.index(deduplicationIndices[1], doc2);
        await flush();
    }

    async function flush() {
        await elasticsearchUtils.flush({ index: deduplicationIndices[0], ignore: [404] });
        await elasticsearchUtils.flush({ index: deduplicationIndices[1], ignore: [404] });
    }
});
