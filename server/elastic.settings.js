module.exports = {
    'index': {
        'analysis': {
            'filter': {
                'decomp': {
                    'type': 'decompound'
                },
                'mcloud_bigram': {
                    'type': 'shingle',
                    'min_shingle_size': '2',
                    'max_shingle_size': '2',
                    'output_unigrams': 'false',
                    'output_unigrams_if_no_shingles': 'false'
                },
                'mcloud_trigram': {
                    'type': 'shingle',
                    'min_shingle_size': '3',
                    'max_shingle_size': '3',
                    'output_unigrams': 'false',
                    'output_unigrams_if_no_shingles': 'false'
                },
                'mcloud_quadgram': {
                    'type': 'shingle',
                    'min_shingle_size': '4',
                    'max_shingle_size': '4',
                    'output_unigrams': 'false',
                    'output_unigrams_if_no_shingles': 'false'
                },
                'german_stemmer': {
                    'type': 'stemmer',
                    'name': 'light_german'
                },
                'decomp_shingle': {
                    'type': 'shingle',
                    'max_shingle_size': '8',
                    'output_unigrams': 'true'
                }
            },
            'analyzer': {
                'mcloud_bigram': {
                    'type': 'custom',
                    'tokenizer': 'standard',
                    'filter': [
                        'decomp',
                        'german_normalization',
                        'lowercase',
                        'mcloud_bigram'
                    ]
                },
                'mcloud_trigram': {
                    'type': 'custom',
                    'tokenizer': 'standard',
                    'filter': [
                        'decomp',
                        'german_normalization',
                        'lowercase',
                        'mcloud_trigram'
                    ]
                },
                'mcloud_quadgram': {
                    'type': 'custom',
                    'tokenizer': 'standard',
                    'filter': [
                        'decomp',
                        'german_normalization',
                        'lowercase',
                        'mcloud_quadgram'
                    ]
                },
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
                        'german_stemmer',
                        'german_normalization'
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
                }
            }
        }
    }
};
