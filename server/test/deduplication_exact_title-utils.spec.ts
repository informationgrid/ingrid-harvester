import {Summary} from '../model/summary';
import {expect} from "chai";
import {ElasticSearchUtils, ElasticSettings} from '../utils/elastic.utils';
import {configure} from 'log4js';
import {doc1, doc2, doc3} from './data/docs.deduplication';
import {elasticsearchMapping} from '../elastic.mapping';
import {elasticsearchSettings} from '../elastic.settings';

let elasticsearch = require('elasticsearch');
configure('./test/log4js-test.json');


describe('deduplication by exact title', function () {
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
    let client = new elasticsearch.Client({
        host: settings.elasticSearchUrl
    });

    let elasticSearchUtils = new ElasticSearchUtils(settings, summary);
    let deduplicateUtils = elasticSearchUtils.deduplicationUtils;
    deduplicateUtils.deduplicationIndices = deduplicationIndices;

    /**
     * Initialize test indices with mapping and settings
     */
    before(async function () {
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
    beforeEach(async function () {
        await deduplicationIndices.forEach( async(index) => {
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

    it('should remove same document from one index by exact title', async function () {
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
    it('should keep most recent document by exact title', async function () {
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
    it('should query with alias except old index', async function () {
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
                            term: { _index: 'test-deduplicate2' }
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

    /**
     * Index doc1 into first deduplication index and doc2 into the second one
     * @param doc1
     * @param doc2
     */
    async function index(doc1, doc2) {
        if (doc1) await client.index({index: deduplicationIndices[0], type: 'base', body: doc1});
        if (doc2) await client.index({index: deduplicationIndices[1], type: 'base', body: doc2});
        await flush();
    }

    async function flush() {
        await client.indices.flush({index: deduplicationIndices[0], ignore: [404]});
        await client.indices.flush({index: deduplicationIndices[1], ignore: [404]});
        await client.indices.flush({index: 'test-deduplicate3', ignore: [404]});
    }

});
