module.exports = {
    properties: {
        'id': {
            'type': 'string',
            'index': 'not_analyzed'
        },
        'title': {
            'type': 'string',
            'analyzer': 'decomp'
        },
        'description': {
            'type': 'string',
            'analyzer': 'decomp'
        },
        'author': {
            'type': 'string',
            'fields': {
                'raw' : {
                    'type': 'string',
                    'index': 'not_analyzed'
                }
            }
        },
        'type': {
            'type': 'string',
            'index': 'not_analyzed'
        },
        'keywords': {
            'type': 'string',
            'index': 'not_analyzed'
        },
        'theme': {
            'type': 'string',
            'index': 'not_analyzed'
        },
        'modified': {
            'type': 'date'
        },
        'distribution': {
            'properties': {
                'id': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'accessURL': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'modified': {
                    'type': 'date'
                }
            }
        },
        'extras': {
            'properties': {
                'metadata': {
                    'properties': {
                        'modified': {
                            'type': 'date'
                        }
                    }
                },
                'license_id': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'license_title': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'license': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'temporal': {
                    'type': 'string'
                },
                'temporal_start': {
                    'type': 'string'
                },
                'temporal_end': {
                    'type': 'string'
                },
                'subgroups': {
                    'type': 'string',
                    'index': 'not_analyzed'
                }
            }
        }
    }
};
