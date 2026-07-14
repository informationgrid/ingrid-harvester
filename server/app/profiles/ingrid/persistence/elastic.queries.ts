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

import type { ElasticQueries as IElasticQueries } from '../../../persistence/elastic.queries.js';
import dayjs from '../../../utils/dayjs.js';

export class ElasticQueries implements IElasticQueries {

    private static instance: ElasticQueries;

    private constructor() {}

    public static getInstance() {
        if (!ElasticQueries.instance) {
            ElasticQueries.instance = new ElasticQueries();
        }
        return ElasticQueries.instance;
    }

    findHistory(baseIndex: string): any {
        return {
            size: 30,
            query: {
                term: {'base_index': baseIndex}
            },
            sort: {
                'timestamp': {"order": "asc"}
            }
        };
    }


    findHistories(): any {
        let timestamp = dayjs().subtract(30, 'day').valueOf();

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
                'timestamp': {"order": "asc"}
            }
        };
    }

    getAccessUrls(after_key): any {
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

    getUrlCheckHistory(): any {
        return {
            size: 30,
            "query": {
                "match_all": {}
            },
            sort: {
                'timestamp': {"order": "asc"}
            }
        };
    }

    getIndexCheckHistory(): any {
        return {
            size: 30,
            "query": {
                "match_all": {}
            },
            sort: {
                'timestamp': {"order": "asc"}
            }
        };
    }


    getFacetsByAttribution(): any {
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
                        "distribution": {
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
