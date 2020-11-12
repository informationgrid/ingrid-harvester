export const elasticsearchMapping = {
    properties: {
        'timestamp': {
            'type': 'date'
        },
        'base_index': {
            'type': 'keyword'
        },
        'numRecords': {
            'type': 'long'
        },
        'numSkipped': {
            'type': 'long'
        },
        'numWarnings': {
            'type': 'long'
        },
        'numRecordErrors': {
            'type': 'long'
        },
        'numAppErrors': {
            'type': 'long'
        },
        'numESErrors': {
            'type': 'long'
        },
        'duration': {
            'type': 'long'
        },
        'warnings': {
            'properties': {
                'message': {
                    'type': 'keyword'
                },
                'count': {
                    'type': 'long'
                }
            }
        },
        'errors': {
            'properties': {
                'message': {
                    'type': 'keyword'
                },
                'count': {
                    'type': 'long'
                }
            }
        }
    }
};
