export const elasticsearchMapping = {
    properties: {
        'timestamp': {
            'type': 'date'
        },
        'duration': {
            'type': 'long'
        },
        "status": {
            "properties": {
                "code": {
                    "type": "text",
                    "fields": {
                        "keyword": {
                            "type": "keyword",
                            "ignore_above": 256
                        }
                    }
                },
                "url": {
                    "properties": {
                        "attribution": {
                            "properties": {
                                "count": {
                                    "type": "long"
                                },
                                "name": {
                                    "type": "text",
                                    "fields": {
                                        "keyword": {
                                            "type": "keyword",
                                            "ignore_above": 256
                                        }
                                    }
                                }
                            }
                        },
                        "url": {
                            "type": "text",
                            "fields": {
                                "keyword": {
                                    "type": "keyword",
                                    "ignore_above": 256
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};
