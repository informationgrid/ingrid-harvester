module.exports = {
    properties: {
        'title': {
            'type': 'string',
            'analyzer': 'decomp'
        },
        'notes': {
            'type': 'string',
            'analyzer': 'decomp'
        },
        'lastUpdate': {
            'type': 'date'
        },
        'metadata_modified': {
            'type': 'date'
        },
        'id': {
            'type': 'string',
            'index': 'not_analyzed'
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
        'license_title': {
            'type': 'string',
            'index': 'not_analyzed'
        },
        'license_id': {
            'type': 'string',
            'index': 'not_analyzed'
        },
        'license': {
            'type': 'string',
            'index': 'not_analyzed'
        },
        'type': {
            'type': 'string',
            'index': 'not_analyzed'
        },
        'tags': {
            'type': 'string',
            'index': 'not_analyzed'
        },
        'groups': {
            'type': 'string',
            'index': 'not_analyzed'
        },
        'extras': {
            'properties': {
                'temporal_coverage': {
                    'type': 'string'
                },
                'temporal_coverage_from': {
                    'type': 'string'
                },
                'temporal_coverage_to': {
                    'type': 'string'
                },
                'subgroups': {
                    'type': 'string',
                    'index': 'not_analyzed'
                }
            }
        },
        'resources': {
            'properties': {
                'id': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'url': {
                    'type': 'string',
                    'index': 'not_analyzed'
                }
            }
        }
    }
};
