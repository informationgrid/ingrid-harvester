module.exports = {
    'index': {
        'analysis': {
            'filter': {
                'decomp': {
                    'type': 'decompound'
                },
                'german_stemmer': {
                    'type': 'stemmer',
                    'name': 'light_german'
                },
                'decomp_shingle': {
                    'type': 'shingle',
                    'max_shingle_size': '8',
                    'output_unigrams': 'false'
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
                        'german_stemmer'
                    ]
                },
                'decomp_german': {
                    'type': 'custom',
                    'tokenizer': 'standard',
                    'filter': [
                        'lowercase',
                        'decomp',
                        'german_normalization',
                        'german_stemmer'
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
