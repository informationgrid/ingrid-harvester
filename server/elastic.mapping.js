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
        'creator': {
            'properties': {
                'name': {
                    'type': 'string',
                    'fields': {
                        'raw': {
                            'type': 'string',
                            'index': 'not_analyzed'
                        }
                    }
                },
                'mbox': {
                    'type': 'string',
                    'index': 'not_analyzed'
                }
            }
        },
        'publisher': {
            'properties': {
                'name': {
                    'type': 'string',
                    'fields': {
                        'raw': {
                            'type': 'string',
                            'index': 'not_analyzed'
                        }
                    }
                },
                'homepage': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'organization': {
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
        'issued': {
            'type': 'date'
        },
        'modified': {
            'type': 'date'
        },
        'accrualPeriodicity': {
            'type': 'string'
        },
        'distribution': {
            'properties': {
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
                'format': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'accessURL': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'issued': {
                    'type': 'date'
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
                        'harvested': {
                            'type': 'date'
                        },
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
                'license_url': {
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
                'groups': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'subgroups': {
                    'type': 'string',
                    'index': 'not_analyzed'
                }
            }
        }
    }
};
