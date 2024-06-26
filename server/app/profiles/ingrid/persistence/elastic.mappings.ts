/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
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
        'dynamic': true,
        '_source': {
            'enabled': true
        },
        'properties': {
            'iPlugId': {
                'type': 'keyword',
                'store': true
            },
            'partner': {
                'type': 'keyword',
                'store': true
            },
            'provider': {
                'type': 'keyword',
                'store': true
            },
            'datatype': {
                'type': 'keyword',
                'store': true
            },
            'dataSourceName': {
                'type': 'keyword',
                'store': true
            },
            't01_object.mod_time': {
                'type': 'keyword',
                'store': true
            },
            't01_object.obj_id': {
                'type': 'keyword',
                'store': true
            },
            't01_object.obj_class': {
                'type': 'keyword',
                'store': true
            },
            't01_object.org_obj_id': {
                'type': 'keyword',
                'store': true
            },
            'hierarchylevel': {
                'type': 'keyword',
                'store': true
            },
            'alternatetitle': {
                'type': 'keyword',
                'store': true
            },
            't02_address.administrative_area_value': {
                'type': 'keyword',
                'store': true
            },
            't02_address.identificationinfo_administrative_area_value': {
                'type': 'keyword',
                'store': true
            },
            'boost': {
                'type': 'float',
                'store': true,
                'null_value': 0.0
            },
            'title': {
                'type': 'text',
                'analyzer': 'german',
                'store': true,
                'fields': {
                    'ngram': {
                        'type':  'text',
                        'analyzer': 'ngram',
                        'search_analyzer': 'german'
                    },
                    'edge_ngram': {
                        'type':  'text',
                        'analyzer': 'edge_ngram',
                        'search_analyzer': 'german'
                    }
                }
            },
            'summary': {
                'type': 'text',
                'analyzer': 'german',
                'store': true,
                'fields': {
                    'ngram': {
                        'type':  'text',
                        'analyzer': 'ngram',
                        'search_analyzer': 'german'
                    },
                    'edge_ngram': {
                        'type':  'text',
                        'analyzer': 'edge_ngram',
                        'search_analyzer': 'german'
                    }
                }
            },
            'content': {
                'type': 'text',
                'analyzer': 'german',
                'store': true,
                'fields': {
                    'ngram': {
                        'type':  'text',
                        'analyzer': 'ngram',
                        'search_analyzer': 'german'
                    },
                    'edge_ngram': {
                        'type':  'text',
                        'analyzer': 'edge_ngram',
                        'search_analyzer': 'german'
                    }
                }
            },
            'location': {
                'type': 'keyword',
                'store': true
            },
            'x1': {
                'type': 'double',
                'store': true
            },
            'x2': {
                'type': 'double',
                'store': true
            },
            'y1': {
                'type': 'double',
                'store': true
            },
            'y2': {
                'type': 'double',
                'store': true
            },
            'idf': {
                'type': 'text',
                'index': false
            },
            'modified': {
                'type': 'date',
                'store': true
            },
            't011_obj_serv_op_connpoint.connect_point': {
                'type': 'keyword',
                'store': true
            },
            'capabilities_url': {
                'type': 'keyword',
                'store': true
            },
            'additional_html_1': {
                'type': 'text',
                'store': true
            },
            't04_search.searchterm': {
                'type': 'keyword',
                'store': true
            },
            't011_obj_serv.type': {
                'type': 'text',
                'store': true
            },
            't011_obj_serv.type_key': {
                'type': 'keyword',
                'store': true
            },
            't011_obj_serv_version.version_value': {
                'type': 'keyword',
                'store': true
            },
            't017_url_ref.url_link': {
                'type': 'keyword',
                'store': true
            },
            't017_url_ref.content': {
                'type': 'keyword',
                'store': true
            },
            't017_url_ref.special_ref': {
                'type': 'keyword',
                'store': true
            },
            'object_reference.obj_to_uuid': {
                'type': 'keyword'
            },
            'object_reference.obj_uuid': {
                'type': 'keyword',
                'store': true
            },
            'object_reference.obj_name': {
                'type': 'keyword',
                'store': true
            },
            'object_reference.obj_class': {
                'type': 'keyword',
                'store': true
            },
            'object_reference.type': {
                'type': 'keyword',
                'store': true
            },
            'object_reference.version': {
                'type': 'keyword',
                'store': true
            },
            'refering.object_reference.obj_uuid': {
                'type': 'keyword',
                'store': true
            },
            'refering.object_reference.obj_name': {
                'type': 'keyword',
                'store': true
            },
            'refering.object_reference.obj_class': {
                'type': 'keyword',
                'store': true
            },
            'refering.object_reference.type': {
                'type': 'keyword',
                'store': true
            },
            'refering.object_reference.version': {
                'type': 'keyword',
                'store': true
            },
            't01_object.time_type': {
                'type': 'keyword',
                'store': true
            },
            't0': {
                'type': 'keyword',
                'store': true
            },
            't1': {
                'type': 'keyword',
                'store': true
            },
            't2': {
                'type': 'keyword',
                'store': true
            },
            'object_use_constraint.license_key': {
                'type': 'keyword',
                'store': true
            },
            'object_use_constraint.license_value': {
                'type': 'keyword',
                'store': true
            },
            'sort_hash': {
                'type': 'keyword'
            }
        }
    };
