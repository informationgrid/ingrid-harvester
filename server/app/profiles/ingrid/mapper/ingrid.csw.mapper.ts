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

import {ingridMapper} from "./ingrid.mapper";
import {CswMapper} from "../../../importer/csw/csw.mapper";

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
        var result = [];

        var geographicElements = CswMapper.select(".//*/gmd:EX_Extent/gmd:geographicElement", this.baseMapper.idInfo);
        for (let geographicElement of geographicElements) {
            var value = CswMapper.select("./gmd:EX_GeographicDescription/gmd:geographicIdentifier/gmd:MD_Identifier/gmd:code/gco:CharacterString", geographicElement, true)?.textContent;
            if(this.hasValue(value)) {
                result.push(value)
            }
            var boundingBoxes = CswMapper.select("./gmd:EX_GeographicBoundingBox", geographicElement);
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
        var result = [];

        var geographicElements = CswMapper.select(".//*/gmd:EX_Extent/gmd:geographicElement", this.baseMapper.idInfo);
        for (let geographicElement of geographicElements) {
            var boundingBoxes = CswMapper.select("./gmd:EX_GeographicBoundingBox", geographicElement);
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
        var mdBrowseGraphics = CswMapper.select(".//gmd:graphicOverview/gmd:MD_BrowseGraphic", this.baseMapper.idInfo)
        if (this.hasValue(mdBrowseGraphics)) {
            for (let mdBrowseGraphic of mdBrowseGraphics) {
                var fileName = CswMapper.select("./gmd:fileName/gco:CharacterString", mdBrowseGraphic, true)?.textContent;
                var fileDescription = CswMapper.select("./gmd:fileDescription/gco:CharacterString", mdBrowseGraphic, true)?.textContent;
                if (this.hasValue(fileName)) {
                    var previewImageHtmlTag = "<img src='" + fileName + "' height='100' class='preview_image' ";
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
            info_note: CswMapper.select("./gmd:purpose/gco:CharacterString", this.baseMapper.idInfo, true)?.textContent,
            loc_descr: CswMapper.select("./gmd:EX_Extent/gmd:description/gco:CharacterString", this.baseMapper.idInfo, true)?.textContent,
            dataset_alternate_name: this.getAlternateTitle(),
            dataset_character_set: undefined,
            dataset_usage: CswMapper.select("./gmd:resourceSpecificUsage/gmd:MD_Usage/gmd:specificUsage/gco:CharacterString", this.baseMapper.idInfo, true)?.textContent,
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
            mod_time: undefined,
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
        var hierarchyLevel = this.getHierarchyLevel()
        var hierarchyLevelName = this.baseMapper.getHierarchyLevelName();
        var objectClass = "1";
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

        var usedKeywords = "";
        // check for INSPIRE themes
        var keywords = CswMapper.select(".//gmd:descriptiveKeywords/gmd:MD_Keywords[gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString='GEMET - INSPIRE themes, version 1.0']/keyword/gco:CharacterString", this.baseMapper.idInfo);
        for(let keyword of keywords){
            var value = keyword.textContent.trim();
            if(this.hasValue(value) && usedKeywords.indexOf(value) == -1) {
                result.push({
                    searchterm: value,
                    type: "I"
                })
                usedKeywords+=value+";"
            }
        }
        // check for GEMET keywords
        var keywords = CswMapper.select(".//gmd:descriptiveKeywords/gmd:MD_Keywords[gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString='GEMET - Concepts, version 2.1']/keyword/gco:CharacterString", this.baseMapper.idInfo);
        for(let keyword of keywords){
            var value = keyword.textContent.trim();
            if(this.hasValue(value) && usedKeywords.indexOf(value) == -1) {
                result.push({
                    searchterm: value,
                    type: "G"
                })
                usedKeywords+=value+";"
            }
        }
        // check for UMTHES keywords
        var keywords = CswMapper.select(".//gmd:descriptiveKeywords/gmd:MD_Keywords[gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString='UMTHES Thesaurus']/keyword/gco:CharacterString", this.baseMapper.idInfo);
        for(let keyword of keywords){
            var value = keyword.textContent.trim();
            if(this.hasValue(value) && usedKeywords.indexOf(value) == -1) {
                result.push({
                    searchterm: value,
                    type: "T"
                })
                usedKeywords+=value+";"
            }
        }
        // check for other keywords
        var keywords = CswMapper.select(".//gmd:descriptiveKeywords/gmd:MD_Keywords/gmd:keyword/gco:CharacterString", this.baseMapper.idInfo);
        for(let keyword of keywords){
            var value = keyword.textContent.trim();
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
        let result = [];
        var formats = CswMapper.select("./gmd:distributionInfo/gmd:MD_Distribution/gmd:distributionFormat/gmd:MD_Format", this.baseMapper.idInfo);
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

    }

    getT011_obj_serv() {

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
                var urlLink = CswMapper.select("gmd:linkage/gmd:URL", onlineResource,true)?.textContent || "";
                var content = CswMapper.select("gmd:name/gco:CharacterString", onlineResource,true)?.textContent || "";
                var descr = CswMapper.select("gmd:description/gco:CharacterString", onlineResource,true)?.textContent || "";
                var codeListValue = CswMapper.select("gmd:function/gmd:CI_OnLineFunctionCode/@codeListValue", onlineResource,true)?.textContent || "";
                var specialRef = "";

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

    getObjectUse() {
        return undefined;
    }

    getObjectUseConstraint() {
        let result = []
        var constraints = CswMapper.select(".//gmd:resourceConstraints//gmd:otherConstraints[../gmd:useConstraints]/gmx:Anchor | .//gmd:resourceConstraints//gmd:otherConstraints[../gmd:useConstraints]/gco:CharacterString", this.baseMapper.idInfo);
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
}


