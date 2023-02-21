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

import {Summary} from '../app/model/summary';
import {expect} from 'chai';
import {configure} from 'log4js';
import {doc1, doc2, doc3, doc5, doc6} from './data/docs.deduplication';
import {elasticsearchMapping} from '../app/profiles/mcloud/elastic/elastic.mapping';
import {elasticsearchSettings} from '../app/profiles/mcloud/elastic/elastic.settings';
import {ElasticSettings} from '../app/utils/elastic.setting';
import {ElasticSearchUtils} from '../app/utils/elastic.utils';

let elasticsearch = require('elasticsearch');
configure('./test/log4js-test.json');

require('url').URL;


xdescribe('deduplication by exact title', function() {
    this.timeout(10000);

    // @ts-ignore
    let settings: ElasticSettings = {
        elasticSearchUrl: 'localhost:9200',
        deduplicationAlias: 'test-dedup'
    };

    let deduplicationIndices = ['test-deduplicate1', 'test-deduplicate2'];

    // @ts-ignore
    let summary: Summary = {
        elasticErrors: []
    };
    const url = new URL(settings.elasticSearchUrl);
    let client = new elasticsearch.Client({
        // log: 'trace',
        host: {
            host: url.hostname,
            port: url.port,
            protocol: url.protocol,
            auth: 'elastic:elastic',
        },
        requestTimeout: 30000
    });

    let elasticSearchUtils = new ElasticSearchUtils(settings, summary);
    let deduplicateUtils = elasticSearchUtils.deduplicationUtils;
    deduplicateUtils.deduplicationIndices = deduplicationIndices;

    /**
     * Initialize test indices with mapping and settings
     */
    before(async function() {
        let indicesToDelete = [...deduplicationIndices, 'test-deduplicate3'];
        await client.indices.delete({
            index: indicesToDelete,
            ignore: [404]
        });
        await flush();
        elasticSearchUtils.indexName = deduplicationIndices[0];
        await elasticSearchUtils.prepareIndex(elasticsearchMapping, elasticsearchSettings);
        elasticSearchUtils.indexName = deduplicationIndices[1];
        await elasticSearchUtils.prepareIndex(elasticsearchMapping, elasticsearchSettings);
        await flush();
    });

    /**
     * Remove all documents from used indices (faster than re-initializing)
     */
    beforeEach(async function() {
        await deduplicationIndices.forEach(async (index) => {
            let searchResponse = await client.search({
                index: index
            });
            await searchResponse.hits.hits.forEach(async (hit) =>
                await client.delete({
                    index: index,
                    type: 'base',
                    id: hit._id
                }));
            await flush();
        });
    });

    it('should remove same document from one index by exact title', async function() {
        // add same document to two different indices
        await index(doc1, doc2);
        let searchResponse = await client.search({
            index: deduplicationIndices
        });
        expect(searchResponse.hits.total).to.be.equal(2);

        // deduplicate
        await deduplicateUtils._deduplicateByTitle();

        // check only one document exists
        await flush();
        searchResponse = await client.search({
            index: deduplicationIndices
        });
        expect(searchResponse.hits.total).to.be.equal(1);
        expect(searchResponse.hits.hits[0]._source['modified']).to.be.equal(new Date('2019-06-15').toISOString());
    });

    // same test again but just switch document order
    it('should keep most recent document by exact title', async function() {
        // add same document to two different indices
        await index(doc2, doc1);
        let searchResponse = await client.search({
            index: deduplicationIndices
        });
        expect(searchResponse.hits.total).to.be.equal(2);

        // deduplicate
        await deduplicateUtils._deduplicateByTitle();

        // check only one document exists
        await flush();
        searchResponse = await client.search({
            index: deduplicationIndices
        });
        expect(searchResponse.hits.total).to.be.equal(1);
        expect(searchResponse.hits.hits[0]._source['modified']).to.be.equal(new Date('2019-06-15').toISOString());
    });

    // same test again but just switch document order
    it('should query with alias except old index', async function() {
        // add same document to two different indices
        await client.index({index: 'test-deduplicate3', type: 'base', body: doc1});
        await index(doc1, doc3);

        // alias is added to only first two indices
        let searchResponse = await client.search({
            // index: ['test*']
            index: ['test-dedup', 'test-deduplicate3']
        });
        expect(searchResponse.hits.total).to.be.equal(3);

        let queryBody = {
            query: {
                bool: {
                    filter: {
                        not: {
                            term: {_index: 'test-deduplicate2'}
                        }
                    }
                }
            }
        };
        searchResponse = await client.search({
            index: ['test-dedup', 'test-deduplicate3'],
            body: queryBody
        });
        expect(searchResponse.hits.total).to.be.equal(2);

        // deduplicate
        await deduplicateUtils._deduplicateByTitle();

        // check only one document exists
        await flush();
        searchResponse = await client.search({
            index: ['test-dedup', 'test-deduplicate3'],
            body: queryBody
        });
        expect(searchResponse.hits.total).to.be.equal(1);
        expect(searchResponse.hits.hits[0]._source['modified']).to.be.equal(new Date('2019-06-15').toISOString());
    });

    it('should remove document with same uuid from index', async function() {
        await index(doc5, doc6);
        let searchResponse = await client.search({
            index: deduplicationIndices
        });
        expect(searchResponse.hits.total).to.be.equal(2);

        await deduplicateUtils._deduplicateByTitle();
        await flush();
        searchResponse = await client.search({
            index: deduplicationIndices
        });

        expect(searchResponse.hits.total).to.be.equal(1);
        //most recent doc is kept
        expect(searchResponse.hits.hits[0]._source['modified']).to.be.equal(new Date('2020-01-03').toISOString());
    });

    /**
     * Index doc1 into first deduplication index and doc2 into the second one
     * @param doc1
     * @param doc2
     */
    async function index(doc1, doc2) {
        if (doc1) {
            await client.index({index: deduplicationIndices[0], type: 'base', body: doc1});
        }
        if (doc2) {
            await client.index({index: deduplicationIndices[1], type: 'base', body: doc2});
        }
        await flush();
    }

    async function flush() {
        await client.indices.flush({index: deduplicationIndices[0], ignore: [404]});
        await client.indices.flush({index: deduplicationIndices[1], ignore: [404]});
        await client.indices.flush({index: 'test-deduplicate3', ignore: [404]});
    }

});
