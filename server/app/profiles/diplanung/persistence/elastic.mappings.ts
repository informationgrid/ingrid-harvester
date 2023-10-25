/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

export const indexMappings = {
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
                    'store': true
                }
            }
        },
        'alternateTitle': {
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
                    'store': true
                }
            }
        },
        'catalog': {
            'properties': {
                'identifier': {
                    'type': 'keyword'
                },
                'description': {
                    'type': 'text',
                    'analyzer': 'decomp'
                },
                'homepage': {
                    'type': 'keyword'
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
                'title': {
                    'type': 'text',
                    'analyzer': 'decomp'
                }
            }
        },
        'identifier': {
            'type': 'keyword'
        },
        'adms_identifier': {
            'type': 'keyword'
        },
        'description': {
            'type': 'text',
            'analyzer': 'decomp',
            'search_analyzer': 'german_simple',
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
                        'accessURL': {
                            'type': 'keyword'
                        },
                        'downloadURL': {
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
                        },
                        'temporal': {
                            'type': 'date_range'
                        },
                        'pluDocType': {
                            'type': 'keyword'
                        },
                        'mapLayerNames': {
                            'type': 'keyword'
                        }
                    }
                },
                'identifier': {
                    'type': 'keyword'
                },
                'passNumber': {
                    'type': 'keyword'
                },
                'temporal': {
                    'type': 'date_range'
                },
                'type': {
                    'type': 'keyword'
                }
            }
        },
        'notification': {
            'type': 'text',
            'analyzer': 'decomp'
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
        'maintainers': {
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
        'contributors': {
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
                'has_organization_name': {
                    'type': 'keyword'
                },
                'has_street_address': {
                    'type': 'keyword'
                },
                'has_region': {
                    'type': 'keyword'
                },
                'has_country_name': {
                    'type': 'keyword'
                },
                'has_postal_code': {
                    'type': 'keyword'
                },
                'has_locality': {
                    'type': 'keyword'
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
        'relation': {
            'type': 'keyword'
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
                'accessURL': {
                    'type': 'keyword'
                },
                'downloadURL': {
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
                },
                'temporal': {
                    'type': 'date_range'
                },
                'pluDocType': {
                    'type': 'keyword'
                },
                'mapLayerNames': {
                    'type': 'keyword'
                }
            }
        },
        'development_freeze_period': {
            'type': 'date_range'
        },
        'centroid': {
            'type': 'geo_point'
        },
        'bounding_box': {
            'type': 'geo_shape'
        },
        'spatial': {
            'type': 'geo_shape',
            'coerce': true
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
                        },
                        'is_changed': {
                            'type': 'boolean',
                            'null_value': true
                        },
                        'quality_notes': {
                            'type': 'text'
                        },
                        'hierarchy_level': {
                            'type': 'keyword'
                        },
                        'operates_on': {
                            'type': 'keyword'
                        },
                        'merged_from': {
                            'type': 'keyword'
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
