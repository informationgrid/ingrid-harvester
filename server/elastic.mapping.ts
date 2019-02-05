export const elasticsearchMapping = {
    properties: {
        'title': {
            'type': 'string',
            'analyzer': 'decomp',
            'fields': {
                'raw': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'decomp_german': {
                    'type': 'string',
                    'analyzer': 'decomp_german',
                    'search_analyzer': 'german_simple'
                },
                'decomp_shingles': {
                    'type': 'string',
                    'analyzer': 'decomp_shingles'
                },
                'suggest_shingles': {
                    'type': 'string',
                    'analyzer': 'suggest_shingles'
                }
            }
        },
        'description': {
            'type': 'string',
            'analyzer': 'decomp',
            'fields': {
                'decomp_german': {
                    'type': 'string',
                    'analyzer': 'decomp_german',
                    'search_analyzer': 'german_simple'
                },
                'decomp_shingles': {
                    'type': 'string',
                    'analyzer': 'decomp_shingles'
                },
                'suggest_shingles': {
                    'type': 'string',
                    'analyzer': 'suggest_shingles'
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
        'contactPoint': {
            'properties': {
                'hasUID': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'fn': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'organization-name': {
                    'type': 'string',
                    'fields': {
                        'raw': {
                            'type': 'string',
                            'index': 'not_analyzed'
                        }
                    }
                },
                'street-address': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'region': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'country-name': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'postal-code': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'hasEmail': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'hasTelephone': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'hasURL': {
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
                },
                'byteSize': {
                    'type': 'long'
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
                        },
                        'isValid': {
                            'type': 'boolean',
                            'null_value': true
                        },
                        'harvesting_errors': {
                            'type': 'string'
                        }
                    }
                },
                'generated_id': {
                    'type': 'string',
                    'index': 'not_analyzed'
                },
                'displayContact': {
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
                        'url': {
                            'type': 'string'
                        }
                    }
                },
                'license': {
                    'properties': {
                        'id': {
                            'type': 'string',
                            'index': 'not_analyzed',
                            'fields': {
                                'analyzed': {
                                    'type': 'string'
                                }
                            }
                        },
                        'title': {
                            'type': 'string',
                            'index': 'not_analyzed',
                            'fields': {
                                'analyzed': {
                                    'type': 'string'
                                }
                            }
                        },
                        'url': {
                            'type': 'string',
                            'index': 'not_analyzed'
                        }
                    }
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
                'mfund_project_title': {
                    'type': 'string',
                    'analyzer': 'decomp',
                    'fields': {
                        'raw': {
                            'type': 'string',
                            'index': 'not_analyzed'
                        }
                    }
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
                },
                'all': {
                    'type': 'string',
                    'analyzer': 'decomp'
                }
            }
        }
    }
};
