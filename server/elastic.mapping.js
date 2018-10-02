module.exports = {
    properties: {
        'title': {
            'type': 'string',
            'analyzer': 'decomp',
            'fields': {
                'raw': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'bigram': {
                    'type': 'string',
                    'analyzer': 'mcloud_bigram'
                },
                'trigram': {
                    'type': 'string',
                    'analyzer': 'mcloud_trigram'
                },
                'quadgram': {
                    'type': 'string',
                    'analyzer': 'mcloud_quadgram'
                }
            }
        },
        'description': {
            'type': 'string',
            'analyzer': 'decomp',
            'fields': {
                'bigram': {
                    'type': 'string',
                    'analyzer': 'mcloud_bigram'
                },
                'trigram': {
                    'type': 'string',
                    'analyzer': 'mcloud_trigram'
                },
                'quadgram': {
                    'type': 'string',
                    'analyzer': 'mcloud_quadgram'
                }
            }
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
                    'fields': {
                        'raw': {
                            'type': 'string',
                            'index': 'not_analyzed'
                        }
                    }
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
        'accessRights': {
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
                        'issued': {
                            'type': 'date'
                        },
                        'modified': {
                            'type': 'date'
                        },
                        'source': {
                            'properties': {
                                'raw_data_source': {
                                    'type': 'string',
                                    'index': 'no'
                                },
                                'portal_link': {
                                    'type': 'string',
                                    'index': 'no'
                                },
                                'attribution': {
                                    'type': 'string',
                                    'index': 'not_analyzed'
                                }
                            }
                        }
                    }
                },
                'generated_id': {
                    'type': 'string',
                    'index': 'not_analyzed'
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
                    'type': 'date'
                },
                'temporal_end': {
                    'type': 'date'
                },
                'groups': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'subgroups': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'harvested_data': {
                    'type': 'string',
                    'index': 'no'
                },
                'mfund_fkz': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'subsection': {
                    'properties': {
                        'title': {
                            'type': 'string',
                            'analyzer': 'decomp'
                        },
                        'description': {
                            'type': 'string',
                            'analyzer': 'decomp'
                        }
                    }
                }
            }
        }
    }
};
