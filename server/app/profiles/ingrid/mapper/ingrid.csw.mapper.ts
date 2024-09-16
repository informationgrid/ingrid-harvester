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

import {ingridMapper} from "./ingrid.mapper";
import {CswMapper} from "../../../importer/csw/csw.mapper";
import {Distribution} from "../../../model/distribution";
import {Codelist} from "../utils/codelist";

const log = require('log4js').getLogger(__filename);

export class ingridCswMapper extends ingridMapper<CswMapper> {
    getT0() {
        let temporal = this.baseMapper.getTemporal();
        if(temporal && temporal[0].gte === temporal[0].lte) {
            return temporal[0].gte;
        }
        return undefined;
    }

    getT1() {
        let temporal = this.baseMapper.getTemporal();
        if(temporal && temporal[0].gte !== temporal[0].lte) {
            return temporal[0].gte ? this.formatDate(temporal[0].gte) : "00000000";
        }
        return undefined;
    }

    getT2() {
        let temporal = this.baseMapper.getTemporal();
        if(temporal && temporal[0].gte !== temporal[0].lte) {
            return temporal[0].lte ? this.formatDate(temporal[0].lte) : "99999999";
        }
        return undefined;
    }

    getAlternateTitle() {
        return this.baseMapper._getAlternateTitle();
    }

    getAddress() {
       return this.baseMapper.getAddress();
    }

    getSummary() {
        return this.baseMapper.getDescription();
    }

    getContent() {

    }

    getLocation() {
        let result = [];

        let geographicElements = CswMapper.select(".//*/gmd:EX_Extent/gmd:geographicElement", this.baseMapper.idInfo);
        for (let geographicElement of geographicElements) {
            let value = CswMapper.select("./gmd:EX_GeographicDescription/gmd:geographicIdentifier/gmd:MD_Identifier/gmd:code/gco:CharacterString", geographicElement, true)?.textContent;
            if(this.hasValue(value)) {
                result.push(value)
            }
            let boundingBoxes = CswMapper.select("./gmd:EX_GeographicBoundingBox", geographicElement);
            for(let boundingBox of boundingBoxes){
                let bound = CswMapper.select("./gmd:" + this.getLongLatBoundname("west") + "/gco:Decimal", boundingBox, true)?.textContent;
                if(bound) {
                    result.push("");
                }
            }
        }

        return this.getSingleEntryOrArray(result);
    }

    getGeoBound(orientation: string){
        let result = [];

        let geographicElements = CswMapper.select(".//*/gmd:EX_Extent/gmd:geographicElement", this.baseMapper.idInfo);
        for (let geographicElement of geographicElements) {
            let boundingBoxes = CswMapper.select("./gmd:EX_GeographicBoundingBox", geographicElement);
            for(let boundingBox of boundingBoxes){
                let bound = CswMapper.select("./gmd:" + this.getLongLatBoundname(orientation) + "/gco:Decimal", boundingBox, true)?.textContent;
                if(bound) {
                    result.push(bound);
                }
            }
        }

        return this.getSingleEntryOrArray(result);
    }

    getLongLatBoundname(orientation: string){
        if(orientation === "east" || orientation === "west")
            return orientation+"BoundLongitude";
        else
            return orientation+"BoundLatitude";
    }


    getX1() {
        return this.getGeoBound("west");
    }

    getX2() {
        return this.getGeoBound("east");
    }

    getY1() {
        return this.getGeoBound("south");
    }

    getY2() {
        return this.getGeoBound("north");
    }

    getIDF() {
        let idf = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<html xmlns=\"http://www.portalu.de/IDF/1.0\">\n  <head/>\n  <body>\n";
        idf += this.baseMapper.record.toString().replace("<gmd:MD_Metadata", "<idf:idfMdMetadata xmlns:idf=\"http://www.portalu.de/IDF/1.0\" ").replace("</gmd:MD_Metadata>", "</idf:idfMdMetadata>").replace("/gmd:CI_ResponsibleParty/g", "idf:idfResponsibleParty")
        idf += "\n  </body>\n</html>\n";
        return idf;
    }

    getCapabilitiesURL() {
        return CswMapper.select("./srv:SV_ServiceIdentification[./srv:serviceType/gco:LocalName/text() = 'WMS' or ./srv:serviceType/gco:LocalName/text() = 'view']//srv:containsOperations/srv:SV_OperationMetadata/srv:operationName/gco:CharacterString[text() = 'GetCapabilities']/../../srv:connectPoint//gmd:URL", this.baseMapper.idInfo, true)?.textContent;
    }

    getAdditionalHTML() {
        let result = [];
        let mdBrowseGraphics = CswMapper.select(".//gmd:graphicOverview/gmd:MD_BrowseGraphic", this.baseMapper.idInfo)
        if (this.hasValue(mdBrowseGraphics)) {
            for (let mdBrowseGraphic of mdBrowseGraphics) {
                let fileName = CswMapper.select("./gmd:fileName/gco:CharacterString", mdBrowseGraphic, true)?.textContent;
                let fileDescription = CswMapper.select("./gmd:fileDescription/gco:CharacterString", mdBrowseGraphic, true)?.textContent;
                if (this.hasValue(fileName)) {
                    let previewImageHtmlTag = "<img src='" + fileName + "' height='100' class='preview_image' ";
                    if (this.hasValue(fileDescription)) {
                        previewImageHtmlTag += "alt='" + fileDescription + "' title='" + fileDescription + "' >";
                    } else {
                        previewImageHtmlTag += "alt='"+ fileName + "' >";
                    }
                    result.push(previewImageHtmlTag);
                }
            }
        }
        return this.getSingleEntryOrArray(result);
    }

    getT01_object() {
        let result = {
            obj_id: this.baseMapper.getGeneratedId(),
            org_obj_id: this.baseMapper.getGeneratedId(),
            obj_class: this.getObjClass(),
            info_note: CswMapper.select("./gmd:MD_DataIdentification/gmd:purpose/gco:CharacterString", this.baseMapper.idInfo, true)?.textContent,
            loc_descr: CswMapper.select("./gmd:MD_DataIdentification/gmd:EX_Extent/gmd:description/gco:CharacterString", this.baseMapper.idInfo, true)?.textContent,
            dataset_alternate_name: this.getAlternateTitle(),
            dataset_character_set: undefined,
            dataset_usage: CswMapper.select("./gmd:MD_DataIdentification/gmd:resourceSpecificUsage/gmd:MD_Usage/gmd:specificUsage/gco:CharacterString", this.baseMapper.idInfo, true)?.textContent,
            data_language_code: undefined,
            metadata_character_set: undefined,
            metadata_standard_name: CswMapper.select("./gmd:metadataStandardName/gco:CharacterString", this.baseMapper.record, true)?.textContent,
            metadata_standard_version: CswMapper.select("./gmd:metadataStandardVersion/gco:CharacterString", this.baseMapper.record, true)?.textContent,
            metadata_language_code: undefined,
            vertical_extent_minimum: undefined,
            vertical_extent_maximum: undefined,
            vertical_extent_unit: undefined,
            vertical_extent_vdatum: undefined,
            ordering_instructions: undefined,
            mod_time: this.getModifiedDate(),
            time_status: this.transformToIgcDomainId(CswMapper.select("./gmd:status/gmd:MD_ProgressCode/@codeListValue", this.baseMapper.idInfo, true)?.textContent,"523"),
            time_type: undefined,
            time_from: undefined,
            time_to: undefined
        };
        let temporal = this.baseMapper.getTemporal();
        if(temporal) {
            if (this.hasValue(temporal[0].gte?.toString()) && this.hasValue(temporal[0].lte?.toString())){
                if (temporal[0].gte.toString() == temporal[0].lte.toString()) result.time_type = "am"
                else result.time_type = "von"
            }
            else if (this.hasValue(temporal[0].gte?.toString()) && !this.hasValue(temporal[0].lte?.toString())){
                result.time_type = "seit"
            }
            else if (!this.hasValue(temporal[0].gte?.toString()) && this.hasValue(temporal[0].lte?.toString())){
                result.time_type = "bis"
            }
            result.time_from = temporal[0].gte ? this.formatDate(temporal[0].gte) : "00000000"
            result.time_to = temporal[0].lte ? this.formatDate(temporal[0].lte) : "99999999";
        }
        return result;
    }

    private getObjClass(){
        let hierarchyLevel = this.getHierarchyLevel()
        let hierarchyLevelName = this.baseMapper.getHierarchyLevelName();
        let objectClass = "1";
        if (this.hasValue(hierarchyLevel)) {
            if (hierarchyLevel.toLowerCase() == "service") {
                // "Geodatendienst"
                objectClass = "3";
            } else if (hierarchyLevel.toLowerCase() == "application") {
                // "Dienst / Anwendung / Informationssystem"
                objectClass = "6";
            } else if (hierarchyLevel.toLowerCase() == "nongeographicdataset") {
                if (this.hasValue(hierarchyLevelName)) {
                    if (hierarchyLevelName == "job") {
                        // "Organisation/Fachaufgabe"
                        objectClass = "0";
                    } else if (hierarchyLevelName == "document") {
                        objectClass = "2";
                    } else if (hierarchyLevelName == "project") {
                        objectClass = "4";
                    } else if (hierarchyLevelName == "database") {
                        objectClass = "5";
                    }
                }
            }
        }
        return objectClass;
    }

    getT04Search() {
        let result = [];

        let usedKeywords = "";
        // check for INSPIRE themes
        let keywords = CswMapper.select(".//gmd:descriptiveKeywords/gmd:MD_Keywords[gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString='GEMET - INSPIRE themes, version 1.0']/keyword/gco:CharacterString", this.baseMapper.idInfo);
        for(let keyword of keywords){
            let value = keyword.textContent.trim();
            if(this.hasValue(value) && usedKeywords.indexOf(value) == -1) {
                result.push({
                    searchterm: value,
                    type: "I"
                })
                usedKeywords+=value+";"
            }
        }
        // check for GEMET keywords
        keywords = CswMapper.select(".//gmd:descriptiveKeywords/gmd:MD_Keywords[gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString='GEMET - Concepts, version 2.1']/keyword/gco:CharacterString", this.baseMapper.idInfo);
        for(let keyword of keywords){
            let value = keyword.textContent.trim();
            if(this.hasValue(value) && usedKeywords.indexOf(value) == -1) {
                result.push({
                    searchterm: value,
                    type: "G"
                })
                usedKeywords+=value+";"
            }
        }
        // check for UMTHES keywords
        keywords = CswMapper.select(".//gmd:descriptiveKeywords/gmd:MD_Keywords[gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString='UMTHES Thesaurus']/keyword/gco:CharacterString", this.baseMapper.idInfo);
        for(let keyword of keywords){
            let value = keyword.textContent.trim();
            if(this.hasValue(value) && usedKeywords.indexOf(value) == -1) {
                result.push({
                    searchterm: value,
                    type: "T"
                })
                usedKeywords+=value+";"
            }
        }
        // check for other keywords
        keywords = CswMapper.select(".//gmd:descriptiveKeywords/gmd:MD_Keywords/gmd:keyword/gco:CharacterString", this.baseMapper.idInfo);
        for(let keyword of keywords){
            let value = keyword.textContent.trim();
            if(this.hasValue(value) && usedKeywords.indexOf(value) == -1) {
                result.push({
                    searchterm: value,
                    type: "F"
                })
                usedKeywords+=value+";"
            }
        }
        return this.getSingleEntryOrArray(result);
    }

    getT0110_avail_format() {
        let result = [],
            formats = CswMapper.select("./gmd:distributionInfo/gmd:MD_Distribution/gmd:distributionFormat/gmd:MD_Format", this.baseMapper.record);
        for(let format of formats){
            result.push({
                "name": CswMapper.select("./gmd:name/gco:CharacterString", format, true)?.textContent,
                version: CswMapper.select("./gmd:version/gco:CharacterString", format, true)?.textContent,
                file_decompression_technique: CswMapper.select("./gmd:fileDecompressionTechnique/gco:CharacterString", format, true)?.textContent,
                specification: CswMapper.select("./gmd:specification/gco:CharacterString", format, true)?.textContent
            })
        }

        return this.getSingleEntryOrArray(result);
    }

    getT011_obj_geo() {
        let lineage = CswMapper.select("./gmd:dataQualityInfo/gmd:DQ_DataQuality/gmd:lineage/gmd:LI_Lineage", this.baseMapper.record, true);
        if(lineage){
            let special_base = CswMapper.select("./gmd:statement/gco:CharacterString", lineage, true)?.textContent;
            let data_base = CswMapper.select("./gmd:source/gmd:LI_Source/gmd:description/gco:CharacterString", lineage, true)?.textContent;
            let method = CswMapper.select("./gmd:processStep/gmd:LI_ProcessStep/gmd:description/gco:CharacterString", lineage, true)?.textContent;
            let datasource_uuid = CswMapper.select("./gmd:MD_DataIdentification/gmd:citation/gmd:CI_Citation/gmd:identifier/gmd:code/gco:CharacterString", this.baseMapper.idInfo, true)?.textContent;

            return {
                special_base,
                data_base,
                method,
                datasource_uuid
            }
        }
        return undefined;
    }

    getT011_obj_geo_scale() {
        let resolutions = CswMapper.select("./gmd:MD_DataIdentification/gmd:spatialResolution/gmd:MD_Resolution", this.baseMapper.idInfo)
        for(let i = 0; i < resolutions.length; i++) {
            let scale =  CswMapper.select("./gmd:equivalentScale/gmd:MD_RepresentativeFraction/gmd:denominator/gco:Integer", resolutions[i], true)?.textContent;
            let resolution_ground =  CswMapper.select("./gmd:distance/gmd:Distance[@uom='meter']", resolutions[i], true)?.textContent;
            let resolution_scan =  CswMapper.select("./gmd:distance/gmd:Distance[@uom='dpi']", resolutions[i], true)?.textContent;

            return {
                scale,
                resolution_ground,
                resolution_scan
            }
        }
        return undefined;
    }

    getT011_obj_serv() {
        let serviceType = CswMapper.select("./srv:SV_ServiceIdentification/srv:serviceType/gco:LocalName", this.baseMapper.idInfo, true)?.textContent;
        if(this.hasValue(serviceType))
            return {
                "type": serviceType
            }
        return undefined;
    }

    getT011_obj_serv_version() {

    }

    getT011_obj_serv_op_connpoint() {

    }

    getT011_obj_serv_op_depends() {

    }

    getT011_obj_serv_op_para() {

    }

    getT011_obj_serv_operation() {

    }

    getT011_obj_serv_op_platform() {

    }

    getT011_obj_topic_cat() {

    }

    getT0113_dataset_reference() {

    }

    getT017_url_ref() {
        let result = []
        let onlineResources = CswMapper.select("./gmd:distributionInfo/gmd:MD_Distribution/gmd:transferOptions/gmd:MD_DigitalTransferOptions/gmd:onLine/gmd:CI_OnlineResource", this.baseMapper.record);
        if (this.hasValue(onlineResources)) {
            for (let onlineResource of onlineResources) {

                // map CI_OnlineResource
                let urlLink = CswMapper.select("gmd:linkage/gmd:URL", onlineResource,true)?.textContent || "";
                let content = CswMapper.select("gmd:name/gco:CharacterString", onlineResource,true)?.textContent || "";
                let descr = CswMapper.select("gmd:description/gco:CharacterString", onlineResource,true)?.textContent || "";
                let codeListValue = CswMapper.select("gmd:function/gmd:CI_OnLineFunctionCode/@codeListValue", onlineResource,true)?.textContent || "";
                let specialRef = "";

                if(this.hasValue(urlLink)) {
                    if(this.hasValue(codeListValue)) {
                        if(this.transformToIgcDomainId(codeListValue, "2000")) {
                            specialRef = this.transformToIgcDomainId(codeListValue, "2000");
                        }
                    }

                    result.push({
                        "url_link" : urlLink,
                        "content": content,
                        "descr": descr,
                        "special_ref": specialRef
                    });
                }
            }
        }
        return result;
    }

    getT021_communication(): any[] {
        let results = [];

        let contacts = CswMapper.select(".//*/gmd:CI_ResponsibleParty", this.baseMapper.record);
        for (let i = 0; i < contacts.length; i++) {
            // map communication Data
            // phone
            let entries = CswMapper.select("./gmd:contactInfo/gmd:CI_Contact/gmd:phone/gmd:CI_Telephone/gmd:voice/gco:CharacterString", contacts[i]);
            if (this.hasValue(entries)) {
                for (let j=0; j<entries.length; j++ ) {
                    results.push({
                        "comm_type": "Telefon",
                        "comm_value": entries[j].textContent
                    })
                }
            }
            // fax
            entries = CswMapper.select("./gmd:contactInfo/gmd:CI_Contact/gmd:phone/gmd:CI_Telephone/gmd:facsimile/gco:CharacterString", contacts[i]);
            if (this.hasValue(entries)) {
                for (let j=0; j<entries.length; j++ ) {
                    results.push({
                        "comm_type": "Fax",
                        "comm_value": entries[j].textContent
                    })
                }
            }
            // email
            entries = CswMapper.select("./gmd:contactInfo/gmd:CI_Contact/gmd:address/gmd:CI_Address/gmd:electronicMailAddress/gco:CharacterString", contacts[i]);
            if (this.hasValue(entries)) {
                for (let j=0; j<entries.length; j++ ) {
                    results.push({
                        "comm_type": "Email",
                        "comm_value": entries[j].textContent
                    })
                }
            }
            // url
            entries = CswMapper.select("./gmd:contactInfo/gmd:CI_Contact/gmd:onlineResource/gmd:CI_OnlineResource/gmd:linkage/gmd:URL", contacts[i]);
            if (this.hasValue(entries)) {
                for (let j=0; j<entries.length; j++ ) {
                    results.push({
                        "comm_type": "URL",
                        "comm_value": entries[j].textContent
                    })
                }
            }
        }
        return results;
    }

    getObjectUse() {
        return undefined;
    }

    getObjectUseConstraint() {
        let result = []
        let constraints = CswMapper.select(".//gmd:resourceConstraints//gmd:otherConstraints[../gmd:useConstraints]/gmx:Anchor | .//gmd:resourceConstraints//gmd:otherConstraints[../gmd:useConstraints]/gco:CharacterString", this.baseMapper.idInfo);
        for(let constraint of constraints){
            result.push(constraint.textContent);
        }
        return result.length ? {license_value: result} : undefined;

    }

    getObjectAccess() {

    }


    private getSingleEntryOrArray(result){
        if (result.length > 1) return result;
        if (result.length == 1) return result[0]
        return undefined;
    }

    async getDistributions(): Promise<Distribution[]> {
        let distributions = await this.baseMapper.getDistributions();
        return distributions?.filter(distribution => distribution.accessURL);
/*

        let result = []

        let operationNodes = CswMapper.select("./srv:SV_ServiceIdentification/srv:containsOperations/srv:SV_OperationMetadata", this.baseMapper.idInfo);

        for (let operationNode of operationNodes){
            let operationName = CswMapper.select("./srv:operationName/gco:CharacterString", operationNode, true)?.textContent;
            let operationServiceUrl = CswMapper.select("./srv:connectPoint/gmd:CI_OnlineResource/gmd:linkage/gmd:URL", operationNode, true)?.textContent;
            if(operationName?.toLowerCase() === 'getcapabilities') {
                result.push({
                    accessUrl : operationServiceUrl
                })
            }
        }

        return result
 */
    }
}


