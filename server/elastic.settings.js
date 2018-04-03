module.exports = {
    'index': {
        'analysis': {
            'filter': {
                'decomp': {
                    'type': 'decompound'
                }
            },
            'analyzer': {
                'decomp': {
                    'type': 'custom',
                    'tokenizer': 'standard',
                    'filter': [
                        'decomp',
                        'unique',
                        'german_normalization',
                        'lowercase'
                    ]
                }
            }
        }
    }
};
