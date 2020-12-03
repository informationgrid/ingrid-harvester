export const elasticsearchMapping = {
    properties: {
        'priority': {
            'type': 'short'
        },
        'title': {
            'type': 'text',
            'store': true,
            'fields': {
                'decomp_german': {
                    'type': 'text',
                    'analyzer': 'decomp_german',
                    'search_analyzer': 'german_simple'
                },
                'decomp_shingles': {
                    'type': 'text',
                    'analyzer': 'decomp_shingles'
                },
                'suggest_shingles': {
                    'type': 'text',
                    'analyzer': 'suggest_shingles'
                },
                'raw': {
                    'type': 'keyword',
                    'store': true,
                }
            }
        },
        'description': {
            'type': 'text',
            'analyzer': 'decomp',
            'fields': {
                'decomp_german': {
                    'type': 'text',
                    'analyzer': 'decomp_german',
                    'search_analyzer': 'german_simple'
                },
                'decomp_shingles': {
                    'type': 'text',
                    'analyzer': 'decomp_shingles'
                },
                'suggest_shingles': {
                    'type': 'text',
                    'analyzer': 'suggest_shingles'
                }
            }
        },
        'creator': {
            'properties': {
                'name': {
                    'type': 'text',
                    'fields': {
                        'raw': {
                            'type': 'keyword'
                        }
                    }
                },
                'mbox': {
                    'type': 'keyword'
                }
            }
        },
        'publisher': {
            'properties': {
                'name': {
                    'type': 'text',
                    'fields': {
                        'raw': {
                            'type': 'keyword'
                        }
                    }
                },
                'homepage': {
                    'type': 'keyword'
                },
                'organization': {
                    'type': 'text',
                    'fields': {
                        'raw': {
                            'type': 'keyword'
                        }
                    }
                }
            }
        },
        'contact_point': {
            'properties': {
                'hasUID': {
                    'type': 'keyword'
                },
                'fn': {
                    'type': 'keyword'
                },
                'organization-name': {
                    'type': 'text',
                    'fields': {
                        'raw': {
                            'type': 'keyword'
                        }
                    }
                },
                'street-address': {
                    'type': 'keyword'
                },
                'region': {
                    'type': 'keyword'
                },
                'country-name': {
                    'type': 'keyword'
                },
                'postal-code': {
                    'type': 'keyword'
                },
                'hasEmail': {
                    'type': 'keyword'
                },
                'hasTelephone': {
                    'type': 'keyword'
                },
                'hasURL': {
                    'type': 'keyword'
                }
            }
        },
        'type': {
            'type': 'keyword'
        },
        'keywords': {
            'type': 'keyword'
        },
        'theme': {
            'type': 'keyword'
        },
        'issued': {
            'type': 'date'
        },
        'modified': {
            'type': 'date'
        },
        'accrual_periodicity': {
            'type': 'keyword'
        },
        'access_rights': {
            'type': 'text'
        },
        'distribution': {
            'properties': {
                'id': {
                    'type': 'keyword'
                },
                'title': {
                    'type': 'text',
                    'analyzer': 'decomp'
                },
                'description': {
                    'type': 'text',
                    'analyzer': 'decomp'
                },
                'format': {
                    'type': 'keyword'
                },
                'accessURL': {
                    'type': 'keyword'
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
                                    'type': 'text',
                                    'index': false
                                },
                                'portal_link': {
                                    'type': 'text',
                                    'index': false
                                },
                                'attribution': {
                                    'type': 'keyword'
                                }
                            }
                        },
                        'is_valid': {
                            'type': 'boolean',
                            'null_value': true
                        },
                        'harvesting_errors': {
                            'type': 'text'
                        }
                    }
                },
                'generated_id': {
                    'type': 'keyword'
                },
                'display_contact': {
                    'properties': {
                        'name': {
                            'type': 'text',
                            'fields': {
                                'raw': {
                                    'type': 'keyword'
                                }
                            }
                        },
                        'url': {
                            'type': 'text'
                        }
                    }
                },
                'license': {
                    'properties': {
                        'id': {
                            'type': 'keyword',
                            'fields': {
                                'analyzed': {
                                    'type': 'text'
                                }
                            }
                        },
                        'title': {
                            'type': 'keyword',
                            'fields': {
                                'analyzed': {
                                    'type': 'text'
                                }
                            }
                        },
                        'url': {
                            'type': 'keyword'
                        }
                    }
                },
                'spatial': {
                    'type': 'geo_shape'
                },
                'spatial_text': {
                    'type': 'text'
                },
                'temporal': {
                    "type": "date_range"
                },
                'groups': {
                    'type': 'keyword'
                },
                'subgroups': {
                    'type': 'keyword'
                },
                'harvested_data': {
                    'type': 'text',
                    'index': false
                },
                'mfund_fkz': {
                    'type': 'keyword'
                },
                'mfund_project_title': {
                    'type': 'text',
                    'analyzer': 'decomp',
                    'fields': {
                        'raw': {
                            'type': 'keyword'
                        }
                    }
                },
                'subsection': {
                    'properties': {
                        'title': {
                            'type': 'text',
                            'analyzer': 'decomp'
                        },
                        'description': {
                            'type': 'text',
                            'analyzer': 'decomp'
                        }
                    }
                },
                'all': {
                    'type': 'text',
                    'analyzer': 'decomp'
                }
            }
        }
    }
};
