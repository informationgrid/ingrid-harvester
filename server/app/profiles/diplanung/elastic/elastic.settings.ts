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

import { IndexSettings } from '../../../persistence/elastic.setting';

export const indexSettings: IndexSettings = {
    'index': {
        'analysis': {
            'filter': {
                'decomp': {
                    'type': 'ngram',
                    'min_gram': 3,
                    'max_gram': 8,
                    'preserve_original': true
                },
                // 'german_stemmer': {
                //     'type': 'stemmer',
                //     'name': 'light_german'
                // },
                'decomp_shingle': {
                    'type': 'shingle',
                    'max_shingle_size': '8',
                    'output_unigrams': 'false'
                },
                'suggest_shingle': {
                    'type': 'shingle',
                    'max_shingle_size': '5',
                    'output_unigrams': 'true'
                }
            },
            'analyzer': {
                'decomp': {
                    'type': 'custom',
                    'tokenizer': 'standard',
                    'filter': [
                        'decomp',
                        'german_normalization',
                        'lowercase'
                    ]
                },
                'german_simple': {
                    'type': 'custom',
                    'tokenizer': 'standard',
                    'filter': [
                        'lowercase',
                        'german_normalization',
                        // 'german_stemmer'
                    ]
                },
                'decomp_german': {
                    'type': 'custom',
                    'tokenizer': 'standard',
                    'filter': [
                        'lowercase',
                        'decomp',
                        'german_normalization',
                        // 'german_stemmer'
                    ]
                },
                'decomp_shingles': {
                    'type': 'custom',
                    'tokenizer': 'standard',
                    'filter': [
                        'lowercase',
                        'decomp',
                        'german_normalization',
                        'decomp_shingle'
                    ]
                },
                'suggest_shingles': {
                    'type': 'custom',
                    'tokenizer': 'standard',
                    'filter': [
                        'lowercase',
                        'suggest_shingle'
                    ]
                }
            }
        }
    }
};
