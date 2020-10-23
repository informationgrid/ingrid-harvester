export class ElasticQueries {

    /**
     *
     */
    static findSameTitle(): any {
        let maxAggregates = 10000;
        return {
            size: 0,
            query: {
                bool: {
                    must_not: {term: {'extras.metadata.isValid': false}}
                }
            },
            aggregations: {
                duplicates: {
                    terms: {
                        field: 'title.raw',
                        min_doc_count: 2,
                        size: maxAggregates
                    },
                    aggregations: {
                        duplicates: {
                            top_hits: {
                                sort: [{'priority': {unmapped_type: 'short', missing: 0, order: 'desc'}},{'modified': {order: 'desc'}}],
                                size: 100,
                                _source: {include: ['title', 'distribution', 'modified']}
                            }
                        }
                    }
                }
            }
        };
    }

    static findSameIdTitleUrls(id, generatedId, urls, title): any {
        /*
         * Should query needs to be wrapped in a must query so that if the
         * should query returns no hits, the must query doesn't match almost all
         * the documents in the index. The query looks for documents, where all
         * of the following are true:
         * - Either one of the following is true
         *     - The given id matches the document's id OR extras.generated_id
         *     - The given generated_id matches the document's id OR extras.generated_id
         *     - The given title matches up to 80% with the document's title AND
         *       at least one of the distribution.accessURL is the same
         * - extras.metadata.isValid is not false (true or missing values)
         *   (make sure we aren't deleting valid documents because of duplicates
         *   that aren't valid)
         * - given timestamp is not equal to the document's modified (date) field
         *   (don't compare this document to itself)
         */
        return {
            query: {
                bool: {
                    must: [
                        {
                            bool: {
                                should: [
                                    {term: {'extras.generated_id': id}},
                                    {term: {'extras.generated_id': generatedId}},
                                    {term: {'_id': id}},
                                    {term: {'_id': generatedId}},
                                    {
                                        bool: {
                                            must: [
                                                {terms: {'distribution.accessURL': urls}},
                                                {
                                                    match: {
                                                        'title.raw': {
                                                            query: title,
                                                            minimum_should_match: '3<80%'
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    ],
                    must_not: [
                        {term: {'extras.metadata.isValid': false}}
                    ]
                }
            }
        };
    }

    static findHistory(baseIndex: string): any {
        return {
            size: 30,
            query: {
                term: {'base_index': baseIndex}
            },
            sort: {
                'timestamp': {"order" : "asc"}
            }
        };
    }
}
