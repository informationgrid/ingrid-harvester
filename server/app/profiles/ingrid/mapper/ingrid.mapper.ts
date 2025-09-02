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

import 'dayjs/locale/de.js';
import {getLogger} from "log4js";
import {CswMapper} from "../../../importer/csw/csw.mapper.js";
import {IndexDocumentFactory} from "../../../model/index.document.factory.js";
import {IngridIndexDocument} from "../model/index.document.js";
import * as crypto from "crypto";
import {Distribution} from "../../../model/distribution.js";
import {Codelist} from "../utils/codelist.js";
import dayjs from "dayjs";
dayjs.locale('de');

export abstract class ingridMapper<M extends CswMapper> implements IndexDocumentFactory<IngridIndexDocument>{

    protected baseMapper: M;

    private _log = getLogger();

    private blacklistedFormats: string[] = [];
    constructor(baseMapper: M) {
        this.baseMapper = baseMapper;
    }

    async create() : Promise<IngridIndexDocument> {
        let result = await {
            iPlugId: this.getIPlugId(),
            uuid: this.getGeneratedId(),
            partner: this.getPartner(),
            provider: this.getProvider(),
            organisation: this.getOrganisation(),
            datatype: this.getDataType(),
            dataSourceName: this.getDataSourceName(),
            extras: {
                // harvested_data: mapper.getHarvestedData(),
                hierarchy_level: this.getHierarchyLevel(),    // only csw
                metadata: {
                    harvested: this.baseMapper.getHarvestingDate(),
                    harvesting_errors: null, // get errors after all operations been done
                    issued: null,
                    is_valid: null, // check validity before persisting to ES
                    modified: null,
                    source: this.baseMapper.getMetadataSource(),
                    merged_from: []
                }
            },
            distributions: await this.getDistributions(),
            t0: this.getT0(),
            t1: this.getT1(),
            t01_object: this.getT01_object(),
            t2: this.getT2(),
            hierarchylevel: this.getHierarchyLevel(),
            alternatetitle: this.getAlternateTitle(),
            t02_address: this.getAddress(),
            boost: this.getBoost(),
            title: this.getTitle(),
            summary: this.getSummary(),
            location: this.getLocation(),
            x1: this.getX1(),
            x2: this.getX2(),
            y1: this.getY1(),
            y2: this.getY2(),
            modified: this.getModifiedDate(),
            capabilities_url: this.getCapabilitiesURL(),
            additional_html_1: this.getAdditionalHTML(),
            t04_search: this.getT04Search(),
            t0110_avail_format: this.getT0110_avail_format(),
            t011_obj_geo: this.getT011_obj_geo(),
            t011_obj_geo_keyc: this.getT011_obj_geo_keyc(),
            t011_obj_geo_symc: this.getT011_obj_geo_symc(),
            t011_obj_geo_scale: this.getT011_obj_geo_scale(),
            t011_obj_geo_spatial_rep: this.getT011_obj_geo_spatial_rep(),
            t011_obj_geo_vector: this.getT011_obj_geo_vector(),
            t011_obj_geo_supplinfo: this.getT011_obj_geo_supplinfo(),
            t011_obj_serv: this.getT011_obj_serv(),
            t011_obj_serv_version: this.getT011_obj_serv_version(),
            t011_obj_serv_op_connpoint: this.getT011_obj_serv_op_connpoint(),
            t011_obj_serv_op_depends: this.getT011_obj_serv_op_depends(),
            t011_obj_serv_op_para: this.getT011_obj_serv_op_para(),
            t011_obj_serv_operation: this.getT011_obj_serv_operation(),
            t011_obj_serv_op_platform: this.getT011_obj_serv_op_platform(),
            t011_obj_topic_cat: this.getT011_obj_topic_cat(),
            t012_obj_adr: this.getT012_obj_adr(),
            t0113_dataset_reference: this.getT0113_dataset_reference(),
            t017_url_ref: this.getT017_url_ref(),
            t021_communication: this.getT021_communication(),
            object_use: this.getObjectUse(),
            object_use_constraint: this.getObjectUseConstraint(),
            object_access: this.getObjectAccess(),
            is_hvd: this.isHvd(),
            spatial_system: this.getSpatialSystem(),
            sort_hash: this.getSortHash(),
            content: null, // assigned after
            idf: null // assigned after
        };
        result.content = this.getContent(result);
        // add "idf" at the end, so it does not get included in the "content" array
        result.idf = this.getIDF();

        this.executeCustomCode(result);

        return result;
    }

    getDistributions(): Promise<Distribution[]>{
        return undefined
    }

    getTitle(): string{
        return this.baseMapper.getTitle();
    }

    getModifiedDate(): Date {
        return this.baseMapper.getModifiedDate();
    }

    getAccessRights(): string[]{
        return this.baseMapper.getAccessRights();
    }

    getGeneratedId(): string{
        return this.baseMapper.getGeneratedId()
    }

    getHierarchyLevel() {
        return this.baseMapper.getHierarchyLevel();
    }

    getHarvestedData(): string{
        return this.baseMapper.getHarvestedData();
    }

    getHarvestingErrors() {
        return this.baseMapper.getHarvestingErrors();
    }

    shouldBeSkipped() {
        return this.baseMapper.shouldBeSkipped();
    }

    executeCustomCode(doc: any) {
        this.baseMapper.executeCustomCode(doc);
    }

    getIPlugId(){
        return this.baseMapper.getSettings().iPlugId;
    }

    getPartner(): string[] {
        return this.baseMapper.getSettings().partner?.split(",")?.map(p => p.trim());
    }

    getProvider(): string[] {
        return this.baseMapper.getSettings().provider?.split(",")?.map(p => p.trim());
    }

    getOrganisation() {
        let organisation = this.transformToIgcDomainId(this.baseMapper.getSettings().provider, "111");
        return organisation;
    }

    getDataType(): string[] {
        return this.baseMapper.getSettings().datatype?.split(",")?.map(p => p.trim()) ?? ["default"];
    }

    getDataSourceName() {
        return this.baseMapper.getSettings().dataSourceName;
    }

    getT0() {
        return undefined;
    }

    getT1() {
        return undefined;
    }

    getT2() {
        return undefined;
    }

    getT01_object() {
        return {
            obj_id: this.baseMapper.getGeneratedId(),
            org_obj_id: this.baseMapper.getGeneratedId()
        }
    }

    getAlternateTitle() {
        return undefined;
    }

    getAddress() {
        return undefined;
    }

    getBoost() {
        return this.baseMapper.getSettings().boost;
    }

    getSummary() {
        return undefined;
    }

    getContent(resultObj) {
        const values = [];
        const traverse = obj => {
            if (obj == null) {
                return;
            }
            if (typeof obj !== 'object') {
                values.push(obj);
                return;
            }        
            Object.values(obj).forEach(traverse);
        };
        traverse(resultObj);
        return values;
    }

    getLocation() {
        return undefined;
    }

    getX1() {
        return undefined;
    }

    getX2() {
        return undefined;
    }

    getY1() {
        return undefined;
    }

    getY2() {
        return undefined;
    }

    getIDF() {
        return undefined;
    }

    getCapabilitiesURL() {
        return undefined;
    }

    getAdditionalHTML() {
        return undefined;
    }

    getT04Search() {
        return undefined;
    }

    getT0110_avail_format() {
        return undefined;
    }

    getT011_obj_geo() {
        return undefined;
    }

    getT011_obj_geo_keyc() {
        return undefined;
    }

    getT011_obj_geo_symc() {
        return undefined;
    }

    getT011_obj_geo_scale() {
        return undefined;
    }

    getT011_obj_geo_spatial_rep() {
        return undefined;
    }

    getT011_obj_geo_vector() {
        return undefined;
    }

    getT011_obj_geo_supplinfo() {
        return undefined;
    }

    getT011_obj_serv() {
        return undefined;
    }

    getT011_obj_serv_version() {
        return undefined;
    }

    getT011_obj_serv_op_connpoint() {
        return undefined;
    }

    getT011_obj_serv_op_depends() {
        return undefined;
    }

    getT011_obj_serv_op_para() {
        return undefined;
    }

    getT011_obj_serv_operation() {
        return undefined;
    }

    getT011_obj_serv_op_platform() {
        return undefined;
    }

    getT011_obj_topic_cat() {
        return undefined;
    }

    getT012_obj_adr() {
        return undefined;
    }

    getT0113_dataset_reference() {
        return undefined;
    }

    getT017_url_ref() {
        return undefined;
    }

    getT021_communication() {
        return undefined;
    }

    getObjectUse() {
        return undefined;
    }

    getObjectUseConstraint() {
        return undefined;
    }

    getObjectAccess() {
        return undefined;
    }

    isHvd(): boolean {
        return undefined;
    }

    getSpatialSystem() {
        return undefined;
    }

    getSortHash() {
        return crypto.createHash('sha1').update(this.getTitle(), 'binary').digest('hex')
    }

    protected hasValue(val) {
        if (typeof val == "undefined") {
            return false;
        } else if (val == null) {
            return false;
        } else if (typeof val == "string" && val == "") {
            return false;
        } else if (typeof val == "object" && Object.keys(val).length === 0) {
            return false;
        } else {
            return true;
        }
    }

    protected formatDate(date: Date){
        if (!date) {
            return null;
        }
        return date.getFullYear()
            +(date.getMonth()+1).toString().padStart(2, "0")
            +date.getDate().toString().padStart(2, "0")
            +date.getHours().toString().padStart(2, "0")
            +date.getMinutes().toString().padStart(2, "0")
            +date.getSeconds().toString().padStart(2, "0")
            +date.getMilliseconds().toString().padStart(3, "0").substring(0,3);
    }

    protected transformToIgcDomainId(value, codelist){
        var id = Codelist.getInstance().getId(codelist, value)
        return id
    }

    protected transformGeneric(value, map, defaultValue) {
        return map[value] ?? defaultValue;
    }
}
