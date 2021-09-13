/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  http://ec.europa.eu/idabc/eupl5
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

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

    static getIndexCheckHistory(): any {
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


    static getFacetsByAttribution(): any {
        let query = {
            "aggs": {
                "attribution": {
                    "terms": {
                        "size": 1000,
                        "field": "extras.metadata.source.attribution",
                        "order": {
                            "_count": "desc"
                        }
                    },
                    "aggs": {
                        "is_valid": {
                            "terms": {
                                "field": "extras.metadata.is_valid",
                                "size": 10,
                                "order": {
                                    "_count": "desc"
                                }
                            }
                        },
                        "distributions": {
                            "terms": {
                                "script": {
                                    "source": "doc['distribution.accessURL'].length"
                                },
                                "size": 100,
                                "order": {
                                    "_key": "asc"
                                }
                            }
                        },
                        "spatial": {
                            "filter": {
                                "exists": {
                                    "field": "extras.spatial"
                                }
                            }
                        },
                        "temporal": {
                            "filter": {
                                "exists": {
                                    "field": "extras.temporal"
                                }
                            }
                        },
                        "accrual_periodicity": {
                            "terms": {
                                "field": "accrual_periodicity",
                                "size": 1000,
                                "order": {
                                    "_key": "asc"
                                }
                            }
                        },
                        "categories": {
                            "terms": {
                                "field": "extras.subgroups",
                                "size": 1000,
                                "order": {
                                    "_key": "asc"
                                }
                            }
                        },
                        "display_contact": {
                            "terms": {
                                "field": "extras.display_contact.name.raw",
                                "size": 1000,
                                "order": {
                                    "_key": "asc"
                                }
                            }
                        },
                        "format": {
                            "terms": {
                                "field": "distribution.format",
                                "size": 1000,
                                "order": {
                                    "_key": "asc"
                                }
                            }
                        },
                        "license": {
                            "terms": {
                                "field": "extras.license.title",
                                "size": 1000,
                                "order": {
                                    "_key": "asc"
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
                            "exists": {
                                "field": "extras.metadata.is_valid"
                            }
                        }
                    ],
                    "filter": [],
                    "should": [],
                    "must_not": []
                }
            }
        };

        return query;
    }
}
