import {now} from "moment";

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
                                sort: [{
                                    'priority': {
                                        unmapped_type: 'short',
                                        missing: 0,
                                        order: 'desc'
                                    }
                                }, {'modified': {order: 'desc'}}],
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
                'timestamp': {"order": "desc"}
            }
        };
    }


    static findHistories(): any {
        const DAYS = 24*60*60*1000;
        let timestamp = now();
        timestamp -= 30*DAYS;

        return {
            size: 1000,
            query: {
            "range": {
            "timestamp": {
                "gte": timestamp
            }
        }
            },
            sort: {
                'timestamp': {"order": "desc"}
            }
        };
    }

    static getAccessUrls(after_key): any {
        let query = {
            "aggs": {
                "accessURL": {
                    "composite": {
                        "size": 100,
                        "sources": [
                            {
                                "accessURL": {
                                    "terms": {
                                        "script": {
                                            "source": "doc['distribution.accessURL']"
                                        }
                                    }
                                }
                            }
                        ]
                    },
                    "aggs": {
                        "attribution": {
                            "terms": {
                                "field": "extras.metadata.source.attribution",
                                "size": 10000,
                                "order": {
                                    "_count": "desc"
                                }
                            }
                        }
                    }
                }
            },
            "size": 0,
            "_source": {
                "excludes": []
            },
            "stored_fields": [
                "*"
            ],
            "script_fields": {},
            "query": {
                "bool": {
                    "must": [
                        {
                            "match_all": {}
                        },
                        {
                            "match_all": {}
                        },
                        {
                            "exists": {
                                "field": "distribution.accessURL"
                            }
                        }
                    ],
                    "filter": [],
                    "should": [],
                    "must_not": []
                }
            }
        };
        if(after_key){
            query.aggs.accessURL.composite["after"] = after_key;
        }
        return query;
    }

    static getUrlCheckHistory(): any {
        return {
            size: 30,
            "query": {
                "match_all": {}
            },
            sort: {
                'timestamp': {"order": "desc"}
            }
        };
    }
}
