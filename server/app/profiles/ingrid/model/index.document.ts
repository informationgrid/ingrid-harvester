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

import { IndexDocument } from '../../../model/index.document';

export type IngridIndexDocument = IndexDocument & {
    iPlugId: string,
    uuid: string,
    partner: string,
    provider: string,
    organisation: string,
    datatype: string[],
    dataSourceName: string,
    t0: string,
    t1: string,
    t2: string,
    t01_object: any,
    hierarchylevel: string,
    alternatetitle: string,
    t02_address: any[],
    boost: number,
    title: string,
    summary: string,
    content: string,
    location: string[],
    x1: number[],
    x2: number[],
    y1: number[],
    y2: number[],
    idf: string,
    modified: string,
    capabilities_url: string[],
    refering?: any,
    refering_service_uuid?: string[],
    additional_html_1: string,
    t04_search: any,
    t0110_avail_format: any,
    t011_obj_geo: any,
    t011_obj_geo_keyc: any,
    t011_obj_geo_symc: any,
    t011_obj_geo_scale: any,
    t011_obj_geo_spatial_rep: any,
    t011_obj_geo_vector: any,
    t011_obj_geo_supplinfo: any,
    t011_obj_serv: any,
    t011_obj_serv_version: any,
    t011_obj_serv_op_connpoint: any,
    t011_obj_serv_op_depends: any,
    t011_obj_serv_op_para: any,
    t011_obj_serv_operation: any,
    t011_obj_serv_op_platform: any,
    t011_obj_topic_cat: any,
    t012_obj_adr: any[],
    t0113_dataset_reference: any,
    t017_url_ref: any[],
    t021_communication: any[],
    object_use: string
    object_use_constraint: string,
    object_access: string,
    object_reference?: any[],
    is_hvd: boolean,
    sort_hash: string
}
