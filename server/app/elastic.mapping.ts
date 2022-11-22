/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

export const elasticsearchMapping = {
    properties: {
        'priority': {
            'type': 'short'
        },
        'completion': {
            'type': 'completion',
            'analyzer': 'german_simple',
            'search_analyzer': 'german_simple'
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
        'plan_or_procedure_start_date': {
            'type': 'date'
        },
        'plan_state': {
            'type': 'keyword'
        },
        'plan_type': {
            'type': 'keyword'
        },
        'plan_type_fine': {
            'type': 'keyword'
        },
        'procedure_state': {
            'type': 'keyword'
        },
        'procedure_type': {
            'type': 'keyword'
        },
        'procedure_start_date': {
            'type': 'date'
        },
        'process_steps': {
            'properties': {
                'distributions': {
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
                        'access_url': {
                            'type': 'keyword'
                        },
                        'download_url': {
                            'type': 'keyword'
                        },
                        'issued': {
                            'type': 'date'
                        },
                        'modified': {
                            'type': 'date'
                        },
                        'byte_size': {
                            'type': 'long'
                        },
                        'period': {
                            'type': 'date_range'
                        },
                        'plu_doc_type': {
                            'type': 'keyword'
                        }
                    }
                },
                'identifier': {
                    'type': 'keyword'
                },
                'period': {
                    'type': 'date_range'
                },
                'type': {
                    'type': 'keyword'
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
                'has_uid': {
                    'type': 'keyword'
                },
                'fn': {
                    'type': 'keyword'
                },
                'organization_name': {
                    'type': 'keyword'
                },
                'has_address': {
                    'properties': {
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
                        'locality': {
                            'type': 'keyword'
                        }
                    }
                },
                'has_email': {
                    'type': 'keyword'
                },
                'has_telephone': {
                    'type': 'keyword'
                },
                'has_url': {
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
                'access_url': {
                    'type': 'keyword'
                },
                'download_url': {
                    'type': 'keyword'
                },
                'issued': {
                    'type': 'date'
                },
                'modified': {
                    'type': 'date'
                },
                'byte_size': {
                    'type': 'long'
                },
                'period': {
                    'type': 'date_range'
                },
                'plu_doc_type': {
                    'type': 'keyword'
                }
            }
        },
        'centroid': {
            'type': 'geo_point'
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
                'transformed_data': {
                    'properties': {
                        'dcat_ap_plu': {
                            'type': 'text',
                            'index': false
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
