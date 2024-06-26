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

import { IndexSettings } from '../../../persistence/elastic.setting';

export const indexSettings: IndexSettings = {
        'index' : {
            'analysis': {
                'filter': {
                    'german_stop': {
                        'type': 'stop',
                        'stopwords': '_german_'
                    },
                    'german_stemmer': {
                        'type': 'stemmer',
                        'language': 'light_german'
                    },
                    'ngram': {
                        'type': 'ngram',
                        'min_gram': 3,
                        'max_gram': 50
                    },
                    'edge_ngram': {
                        'type': 'edge_ngram',
                        'min_gram': 3,
                        'max_gram': 50
                    }
                },
                'analyzer': {
                    'ngram': {
                        'type': 'custom',
                        'tokenizer': 'standard',
                        'filter': [
                            'lowercase',
                            'german_stop',
                            'german_normalization',
                            'german_stemmer',
                            'ngram',
                            'unique'
                        ]
                    },
                    'edge_ngram': {
                        'type': 'custom',
                        'tokenizer': 'standard',
                        'filter': [
                            'lowercase',
                            'german_stop',
                            'german_normalization',
                            'german_stemmer',
                            'edge_ngram',
                            'unique'
                        ]
                    },
                    'phrase': {
                        'type': 'custom',
                        'tokenizer': 'keyword',
                        'filter': [
                            'lowercase'
                        ]
                    }
                }
            }
        },
    "max_shingle_diff": 6,
    "max_ngram_diff": 47,
    "number_of_shards": 1,
    "number_of_replicas": 0
    };
