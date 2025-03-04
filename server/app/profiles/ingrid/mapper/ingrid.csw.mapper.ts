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

const log = require('log4js').getLogger(__filename);

export class ingridCswMapper extends ingridMapper<CswMapper> {

    getT0() {
        let temporal = this.baseMapper.getTemporal()?.[0];
        if (temporal && temporal.gte === temporal.lte) {
            return temporal.gte;
        }
        return undefined;
    }

    getT1() {
        let temporal = this.baseMapper.getTemporal()?.[0];
        if (temporal && temporal.gte !== temporal.lte) {
            return temporal.gte ? this.formatDate(temporal.gte) : "00000000";
        }
        return undefined;
    }

    getT2() {
        let temporal = this.baseMapper.getTemporal()?.[0];
        if (temporal && temporal.gte !== temporal.lte) {
            return temporal.lte ? this.formatDate(temporal.lte) : "99999999";
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

    getLocation() {
        let result = [];
        let geographicElements = CswMapper.select(".//*/gmd:EX_Extent/gmd:geographicElement", this.baseMapper.idInfo);
        geographicElements?.forEach(geographicElement => {
            let value = this.text("./gmd:EX_GeographicDescription/gmd:geographicIdentifier/gmd:MD_Identifier/gmd:code/gco:CharacterString", geographicElement);
            if(this.hasValue(value)) {
                result.push(value)
            }
            let boundingBoxes = CswMapper.select("./gmd:EX_GeographicBoundingBox", geographicElement);
            boundingBoxes?.forEach(boundingBox => {
                let bound = this.text("./gmd:" + this.getLongLatBoundname("west") + "/gco:Decimal", boundingBox);
                if(bound) {
                    result.push("");
                }
            });
        });
        return this.getSingleEntryOrArray(result);
    }

    private getGeoBound(orientation: string){
        let result = [];
        let geographicElements = CswMapper.select(".//*/gmd:EX_Extent/gmd:geographicElement", this.baseMapper.idInfo);
        geographicElements?.forEach(geographicElement => {
            let boundingBoxes = CswMapper.select("./gmd:EX_GeographicBoundingBox", geographicElement);
            boundingBoxes?.forEach(boundingBox => {
                let bound = this.text("./gmd:" + this.getLongLatBoundname(orientation) + "/gco:Decimal", boundingBox);
                if(bound) {
                    result.push(bound);
                }
            });
        });
        return this.getSingleEntryOrArray(result);
    }

    private getLongLatBoundname(orientation: string){
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
        idf += this.baseMapper.record.toString().replace("<gmd:MD_Metadata", "<idf:idfMdMetadata xmlns:idf=\"http://www.portalu.de/IDF/1.0\" ").replace("</gmd:MD_Metadata>", "</idf:idfMdMetadata>").replaceAll("gmd:CI_ResponsibleParty", "idf:idfResponsibleParty");
        idf += "\n  </body>\n</html>\n";
        return idf;
    }

    getCapabilitiesURL(): string[] {
        let url = this.text(`./srv:SV_ServiceIdentification[
                ./srv:serviceType/gco:LocalName/text() = 'WMS'
                or ./srv:serviceType/gco:LocalName/text() = 'view'
                or ./srv:serviceType/gco:LocalName/text() = 'WFS'
                or ./srv:serviceType/gco:LocalName/text() = 'download'
            ]//srv:containsOperations/srv:SV_OperationMetadata/srv:operationName/gco:CharacterString[text() = 'GetCapabilities']/../../srv:connectPoint//gmd:URL`, this.baseMapper.idInfo);
        return url ? [url] : [];
    }

    getAdditionalHTML() {
        let result = [];
        let mdBrowseGraphics = CswMapper.select(".//gmd:graphicOverview/gmd:MD_BrowseGraphic", this.baseMapper.idInfo)
        mdBrowseGraphics?.forEach(mdBrowseGraphic => {
            let fileName = this.text("./gmd:fileName/gco:CharacterString", mdBrowseGraphic);
            let fileDescription = this.text("./gmd:fileDescription/gco:CharacterString", mdBrowseGraphic);
            if (this.hasValue(fileName)) {
                let previewImageHtmlTag = "<img src='" + fileName + "' height='100' class='preview_image' ";
                if (this.hasValue(fileDescription)) {
                    previewImageHtmlTag += "alt='" + fileDescription + "' title='" + fileDescription + "' >";
                } else {
                    previewImageHtmlTag += "alt='"+ fileName + "' >";
                }
                result.push(previewImageHtmlTag);
            }
        });
        return this.getSingleEntryOrArray(result);
    }

    getT01_object() {
        let result = {
            obj_id: this.baseMapper.getGeneratedId(),
            org_obj_id: this.baseMapper.getGeneratedId(),
            obj_class: this.getObjClass(),
            info_note: this.text("./gmd:MD_DataIdentification/gmd:purpose/gco:CharacterString", this.baseMapper.idInfo),
            loc_descr: this.text("./gmd:MD_DataIdentification/gmd:EX_Extent/gmd:description/gco:CharacterString", this.baseMapper.idInfo),
            dataset_alternate_name: this.getAlternateTitle(),
            dataset_character_set: this.transformToIgcDomainId(this.text("./gmd:MD_DataIdentification/gmd:characterSet/gmd:MD_CharacterSetCode/@codeListValue", this.baseMapper.idInfo), "510"),
            dataset_usage: this.text("./gmd:MD_DataIdentification/gmd:resourceSpecificUsage/gmd:MD_Usage/gmd:specificUsage/gco:CharacterString", this.baseMapper.idInfo),
            data_language_code: this.transformGeneric(this.text("./*/gmd:language/gco:CharacterString", this.baseMapper.idInfo), {"deu":"de", "ger":"de", "eng":"en"}, "de"),
            metadata_character_set: this.transformToIgcDomainId(this.text("./gmd:characterSet/gmd:MD_CharacterSetCode/@codeListValue", this.baseMapper.record), "510"),
            metadata_standard_name: this.text("./gmd:metadataStandardName/gco:CharacterString", this.baseMapper.record),
            metadata_standard_version: this.text("./gmd:metadataStandardVersion/gco:CharacterString", this.baseMapper.record),
            metadata_language_code: this.transformGeneric(this.text("./*/gmd:language/gco:CharacterString", this.baseMapper.idInfo), {"deu":"de", "ger":"de", "eng":"en"}, "de"),
            vertical_extent_minimum: this.text("./*/gmd:extent/gmd:EX_Extent/gmd:verticalElement/gmd:EX_VerticalExtent/gmd:minimumValue/gco:Real", this.baseMapper.idInfo),
            vertical_extent_maximum: this.text("./*/gmd:extent/gmd:EX_Extent/gmd:verticalElement/gmd:EX_VerticalExtent/gmd:maximumValue/gco:Real", this.baseMapper.idInfo),
            vertical_extent_unit: this.transformToIgcDomainId(this.text("./*/gmd:EX_Extent/gmd:verticalElement/gmd:EX_VerticalExtent/gmd:verticalCRS/gml:verticalCRS/gml:verticalCS/gml:VerticalCS/gml:axis/gml:CoordinateSystemAxis/@uom", this.baseMapper.idInfo), "102"),
            vertical_extent_vdatum: this.transformToIgcDomainId(this.text("./*/gmd:EX_Extent/gmd:verticalElement/gmd:EX_VerticalExtent/gmd:verticalCRS/gml:verticalCRS/gml:verticalDatum/gml:VerticalDatum/gml:identifier", this.baseMapper.idInfo), "101"),
            ordering_instructions: this.text("./gmd:distributionInfo/gmd:MD_Distribution/gmd:distributor/gmd:MD_Distributor/gmd:distributionOrderProcess/gmd:MD_StandardOrderProcess/gmd:orderingInstructions/gco:CharacterString", this.baseMapper.record),
            mod_time: this.getModifiedDate(),
            time_status: this.transformToIgcDomainId(this.text("./gmd:MD_DataIdentification/gmd:status/gmd:MD_ProgressCode/@codeListValue", this.baseMapper.idInfo), "523"),
            time_type: undefined,
            time_from: undefined,
            time_to: undefined,
            time_descr: this.text("./gmd:MD_DataIdentification/gmd:resourceMaintenance/gmd:MD_MaintenanceInformation/gmd:maintenanceNote/gco:CharacterString", this.baseMapper.idInfo),
            time_period: this.transformToIgcDomainId(this.text("./gmd:MD_DataIdentification/gmd:resourceMaintenance/gmd:MD_MaintenanceInformation/gmd:maintenanceAndUpdateFrequency/gmd:MD_MaintenanceFrequencyCode/@codeListValue", this.baseMapper.idInfo), "518")
        };
        let temporal = this.baseMapper.getTemporal()?.[0];
        if (temporal) {
            let hasStart = this.hasValue(temporal.gte?.toString());
            let hasEnd = this.hasValue(temporal.lte?.toString());
            if (hasStart && hasEnd){
                if (temporal.gte.toString() == temporal.lte.toString()) result.time_type = "am"
                else result.time_type = "von"
            }
            else if (hasStart && !hasEnd){
                if (temporal.lte === undefined) {
                    result.time_type = "seit";
                }
                else if (temporal.lte === null) {
                    result.time_type = "seitX";
                }
            }
            else if (!hasStart && hasEnd){
                result.time_type = "bis"
            }
            result.time_from = temporal.gte ? this.formatDate(temporal.gte) : "00000000"
            result.time_to = temporal.lte ? this.formatDate(temporal.lte) : "99999999";
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
        const addKeywords = (xpath: string, type: string) => {
            let keywords = CswMapper.select(xpath, this.baseMapper.idInfo);
            keywords?.forEach(keyword => {
                let value = keyword.textContent?.trim();
                if (this.hasValue(value) && !result.some(r => r.searchterm === value)) {
                    result.push({
                        searchterm: value,
                        type: type,
                    });
                }
            });
        };
        // check for INSPIRE themes
        addKeywords(".//gmd:descriptiveKeywords/gmd:MD_Keywords[gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString='GEMET - INSPIRE themes, version 1.0']/keyword/gco:CharacterString", "I");
        // check for GEMET keywords
        addKeywords(".//gmd:descriptiveKeywords/gmd:MD_Keywords[gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString='GEMET - Concepts, version 2.1']/keyword/gco:CharacterString", "G");
        // check for UMTHES keywords
        addKeywords(".//gmd:descriptiveKeywords/gmd:MD_Keywords[gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString='UMTHES Thesaurus']/keyword/gco:CharacterString", "T");
        // check for other keywords
        addKeywords(".//gmd:descriptiveKeywords/gmd:MD_Keywords/gmd:keyword/gco:CharacterString", "F");
        return this.getSingleEntryOrArray(result);
    }

    getT0110_avail_format() {
        let formats = CswMapper.select("./gmd:distributionInfo/gmd:MD_Distribution/gmd:distributionFormat/gmd:MD_Format", this.baseMapper.record);
        let result = formats?.map(format => ({
            name: this.text("./gmd:name/gco:CharacterString", format),
            version: this.text("./gmd:version/gco:CharacterString", format),
            file_decompression_technique: this.text("./gmd:fileDecompressionTechnique/gco:CharacterString", format),
            specification: this.text("./gmd:specification/gco:CharacterString", format)
        }));
        return this.getSingleEntryOrArray(result);
    }

    getT011_obj_geo() {
        let lineage = CswMapper.select("./gmd:dataQualityInfo/gmd:DQ_DataQuality/gmd:lineage/gmd:LI_Lineage", this.baseMapper.record, true);
        let report = CswMapper.select("./gmd:dataQualityInfo/gmd:DQ_DataQuality/gmd:report", this.baseMapper.record, true);
        let result: any = {
            datasource_uuid: this.text("./*/gmd:citation/gmd:CI_Citation/gmd:identifier/*/gmd:code/gco:CharacterString", this.baseMapper.idInfo),
            referencesystem_id: this.getReferenceSystems(),
            hierarchy_level: this.transformGeneric(this.text("./gmd:hierarchyLevelName/gmd:MD_ScopeCode/@codeListValue", this.baseMapper.record), {"dataset":"5", "series":"6"}, false),
            vector_topology_level: this.transformToIgcDomainId(this.text("./gmd:spatialRepresentationInfo/gmd:MD_VectorSpatialRepresentation/gmd:topologyLevel/gmd:MD_TopologyLevelCode/@codeListValue", this.baseMapper.record), "528"),
            keyc_incl_w_dataset: this.transformGeneric(this.text("./gmd:contentInfo/gmd:MD_FeatureCatalogueDescription/gmd:includedWithDataset/gco:Boolean", this.baseMapper.record), {"true":"1", "false":"0"}, false)
        };
        if (lineage) {
            result = {
                ...result,
                special_base: this.text("./gmd:statement/gco:CharacterString", lineage),
                data_base: this.text("./gmd:source/gmd:LI_Source/gmd:description/gco:CharacterString", lineage),
                method: this.text("./gmd:processStep/gmd:LI_ProcessStep/gmd:description/gco:CharacterString", lineage),
            };
        }
        if (report) {
            result = {
                ...result,
                rec_exact: this.text("./gmd:DQ_RelativeInternalPositionalAccuracy/gmd:DQ_QuantitativeResult/gmd:value/gco:Record", report),
                rec_grade: this.text("./gmd:DQ_CompletenessCommission/gmd:DQ_QuantitativeResult/gmd:value/gco:Record", report),
                pos_accuracy_vertical: this.text("./gmd:DQ_RelativeInternalPositionalAccuracy[gmd:measureDescription/gco:CharacterString='vertical']/gmd:DQ_QuantitativeResult/gmd:value/gmd:Record", report),
            };
        }
        return result;
    }

    getT011_obj_geo_keyc() {
        let fcCitations = CswMapper.select("./gmd:contentInfo/gmd:MD_FeatureCatalogueDescription/gmd:featureCatalogueCitation/gmd:CI_Citation", this.baseMapper.record);
        return fcCitations?.map(citation => ({
            symbol_cat: this.text("./gmd:title/gco:CharacterString", citation),
            symbol_date: this.formatDate(new Date(Date.parse(this.text("./gmd:date/gmd:CI_Date/gmd:date/gco:Date", citation)))),
            edition: this.text("./gmd:edition/gco:CharacterString", citation)
        }));
    }

    getT011_obj_geo_symc() {
        let pcCitations = CswMapper.select("./gmd:portrayalCatalogueInfo/gmd:MD_PortrayalCatalogueReference/gmd:portrayalCatalogueCitation/gmd:CI_Citation", this.baseMapper.record);
        return pcCitations?.map(citation => ({
            symbol_cat: this.text("./gmd:title/gco:CharacterString", citation),
            symbol_date: this.formatDate(new Date(Date.parse(this.text("./gmd:date/gmd:CI_Date/gmd:date/gco:Date", citation)))),
            edition: this.text("./gmd:edition/gco:CharacterString", citation)
        }));
    }

    getT011_obj_geo_scale() {
        let resolutions = CswMapper.select("./gmd:MD_DataIdentification/gmd:spatialResolution/gmd:MD_Resolution", this.baseMapper.idInfo)
        return resolutions?.map(resolution => ({
            scale: this.text("./gmd:equivalentScale/gmd:MD_RepresentativeFraction/gmd:denominator/gco:Integer", resolution),
            resolution_ground: this.text("./gmd:distance/gmd:Distance[@uom='meter']", resolution),
            resolution_scan: this.text("./gmd:distance/gmd:Distance[@uom='dpi']", resolution)
        }));
    }

    getT011_obj_geo_spatial_rep() {
        return {
            type: this.transformToIgcDomainId(this.text("./gmd:MD_DataIdentification/gmd:spatialRepresentationType/MD_SpatialRepresentationTypeCode/@codeListValue", this.baseMapper.idInfo), "526")
        };
    }

    getT011_obj_geo_vector() {
        let geometricObjects = CswMapper.select("./gmd:spatialRepresentationInfo/gmd:MD_VectorSpatialRepresentation/gmd:geometricObjects/gmd:MD_GeometricObjects", this.baseMapper.record);
        return geometricObjects?.map(geometricObject => ({
            geometric_object_type: this.transformToIgcDomainId(this.text("./gmd:geometricObjectType/gmd:MD_GeometricObjectTypeCode/@codeListValue", geometricObject), "515"),
            geometric_object_count: this.text("./gmd:geometricObjectCount/gco:Integer", geometricObject)
        }));
    }

    getT011_obj_geo_supplinfo() {
        return {
            feature_type: this.text("./gmd:contentInfo/gmd:MD_FeatureCatalogueDescription/gmd:featureTypes/gco:LocalName", this.baseMapper.record)
        };
    }

    getT011_obj_serv() {
        return {
            base: this.text("./gmd:dataQualityInfo/gmd:DQ_DataQuality/gmd:lineage/gmd:LI_Lineage/gmd:source/gmd:LI_Source/gmd:description/gco:CharacterString", this.baseMapper.record),
            history: this.text("./gmd:dataQualityInfo/gmd:DQ_DataQuality/gmd:lineage/gmd:LI_Lineage/gmd:processStep/gmd:LI_ProcessStep/gmd:description/gco:CharacterString", this.baseMapper.record),
            type: this.text("./srv:SV_ServiceIdentification/srv:serviceType/gco:LocalName", this.baseMapper.idInfo)
        };
    }

    getT011_obj_serv_version() {
        let serviceTypeVersion = this.text("./srv:SV_ServiceIdentification/srv:serviceTypeVersion/gco:CharacterString", this.baseMapper.idInfo);
        return this.hasValue(serviceTypeVersion) ? { version_value: serviceTypeVersion } : undefined;
    }

    getT011_obj_serv_op_connpoint() {
        let operationsMetadata = CswMapper.select('./srv:SV_ServiceIdentification/srv:containsOperations/srv:SV_OperationMetadata', this.baseMapper.idInfo);
        return operationsMetadata?.map(operationMetadata => ({
            connect_point: this.text("./srv:connectPoint/gmd:CI_OnlineResource/gmd:linkage/gmd:URL", operationMetadata)
        }));
    }

    getT011_obj_serv_op_depends() {
        let dependsOn = this.text("./srv:SV_ServiceIdentification/srv:containsOperations/srv:SV_OperationMetadata/srv:dependsOn/srv:SV_OperationMetadata/srv:operationName/gco:CharacterString", this.baseMapper.idInfo);
        return this.hasValue(dependsOn) ? { depends_on: dependsOn } : undefined;
    }

    getT011_obj_serv_op_para() {
        let svParameter = CswMapper.select("./srv:SV_ServiceIdentification/srv:containsOperations/srv:SV_OperationMetadata/srv:parameters/srv:SV_Parameter", this.baseMapper.idInfo, true);
        if (!svParameter) {
            return undefined;
        }
        return {
            name: this.text("./srv:name", svParameter),
            direction: this.text("./srv:direction/srv:SV_ParameterDirection", svParameter),
            descr: this.text("./gmd:description/gco:CharacterString", svParameter),
            optional: this.transformGeneric(this.text("./srv:optionality/gco:CharacterString", svParameter), {"optional":"1", "mandatory":"0"}, false),
            repeatability: this.transformGeneric(this.text("./srv:repeatability/gco:Boolean", svParameter), {"true":"1", "false":"0"}, false)
        };
    }

    getT011_obj_serv_operation() {
        let operationsMetadata = CswMapper.select('./srv:SV_ServiceIdentification/srv:containsOperations/srv:SV_OperationMetadata', this.baseMapper.idInfo);
        return operationsMetadata?.map(operationMetadata => ({
            name: this.text("./srv:operationName/gco:CharacterString", operationMetadata),
            descr: this.text("./srv:operationDescription/gco:CharacterString", operationMetadata),
            invocation_name: this.text("./srv:invocationName/gco:CharacterString", operationMetadata)
        }));
    }

    getT011_obj_serv_op_platform() {
        let operationsMetadata = CswMapper.select('./srv:SV_ServiceIdentification/srv:containsOperations/srv:SV_OperationMetadata', this.baseMapper.idInfo);
        return operationsMetadata?.map(operationMetadata => ({
            platform: this.text("./srv:DCP/srv:DCPList/@codeListValue", operationMetadata)
        }));
    }

    getT011_obj_topic_cat() {
        let topicCategories = CswMapper.select("./gmd:MD_DataIdentification/gmd:topicCategory/gmd:MD_TopicCategoryCode", this.baseMapper.idInfo);
        return topicCategories?.map(topicCategory => ({
            topic_category: this.transformToIgcDomainId(topicCategory.textContent, "527")
        }));
    }

    getT012_obj_adr() {
        let roles = CswMapper.select(".//gmd:CI_ResponsibleParty", this.baseMapper.record);
        return roles?.map(role => ({
            special_ref: "0", // explicitly set to 0
            typ: this.transformToIgcDomainId(this.text("./gmd:role/gmd:CI_RoleCode/@codeListValue", role), "505")
        }));
    }

    getT0113_dataset_reference() {
        let dates = CswMapper.select("./gmd:MD_DataIdentification/gmd:citation/gmd:CI_Citation/gmd:date/gmd:CI_Date", this.baseMapper.idInfo);
        return dates?.map(dateNode => {
            let date = this.text("./gmd:date/gco:Date|./gmd:date/gco:DateTime", dateNode);
            return {
                reference_date: date ? this.formatDate(new Date(Date.parse(date))) : null,
                type: this.transformToIgcDomainId(this.text("./gmd:dateType/gmd:CI_DateTypeCode/@codeListValue", dateNode), "502")
            };
        });
    }

    getT017_url_ref() {
        let onlineResources = CswMapper.select("./gmd:distributionInfo/gmd:MD_Distribution/gmd:transferOptions/gmd:MD_DigitalTransferOptions/gmd:onLine/gmd:CI_OnlineResource", this.baseMapper.record);
        let result = onlineResources?.map(onlineResource => ({
            url_link : this.text("./gmd:linkage/gmd:URL", onlineResource),
            content: this.text("./gmd:name/gco:CharacterString", onlineResource) ?? "",
            descr: this.text("./gmd:description/gco:CharacterString", onlineResource) ?? "",
            special_ref: this.transformToIgcDomainId(this.text("gmd:function/gmd:CI_OnLineFunctionCode/@codeListValue", onlineResource), "2000") ?? ""
        }));
        return result.filter(resource => this.hasValue(resource.url_link));
    }

    getT021_communication(): any[] {
        let results = [];
        let contacts = CswMapper.select(".//*/gmd:CI_ResponsibleParty", this.baseMapper.record);
        contacts?.forEach(contact => {
            const extractEntries = (path: string, commType: string) => {
                CswMapper.select(path, contact)?.forEach(entry => {
                    const commValue = entry.textContent;
                    if (this.hasValue(commValue)) {
                        results.push({
                            comm_type: commType,
                            comm_value: commValue,
                        });
                    }
                });
            };
            extractEntries("./gmd:contactInfo/gmd:CI_Contact/gmd:phone/gmd:CI_Telephone/gmd:voice/gco:CharacterString", "Telefon");
            extractEntries("./gmd:contactInfo/gmd:CI_Contact/gmd:phone/gmd:CI_Telephone/gmd:facsimile/gco:CharacterString", "Fax");
            extractEntries("./gmd:contactInfo/gmd:CI_Contact/gmd:address/gmd:CI_Address/gmd:electronicMailAddress/gco:CharacterString", "Email");
            extractEntries("./gmd:contactInfo/gmd:CI_Contact/gmd:onlineResource/gmd:CI_OnlineResource/gmd:linkage/gmd:URL", "URL");
        });
        return results;
    }

    getObjectUse() {
        let constraints = CswMapper.select("./*/gmd:resourceConstraints/*/gmd:otherConstraints[../gmd:useLimitation]/gco:CharacterString", this.baseMapper.idInfo);
        let result = constraints?.map(constraint => constraint.textContent).filter(text => text?.trim());
        return result?.length ? { terms_of_use_value: result } : undefined;
    }

    getObjectUseConstraint() {
        let constraints = CswMapper.select("./*/gmd:resourceConstraints/*/gmd:otherConstraints[../gmd:useConstraints]/gmx:Anchor | ./*/gmd:resourceConstraints/*/gmd:otherConstraints[../gmd:useConstraints]/gco:CharacterString", this.baseMapper.idInfo);
        let result = constraints?.map(constraint => constraint.textContent).filter(text => text?.trim());
        return result?.length ? { license_value: result } : undefined;
    }

    getObjectAccess() {
        let restrictionValue = this.text("./*/gmd:resourceConstraints/*/gmd:otherConstraints[../gmd:accessConstraints]/gco:CharacterString", this.baseMapper.idInfo);
        return {
            restriction_key: this.transformToIgcDomainId(restrictionValue, "6010") ?? "-1",
            restriction_value: restrictionValue,
            terms_of_use: this.text("./*/gmd:resourceConstraints/gmd:MD_LegalConstraints/gmd:useLimitation/gco:CharacterString", this.baseMapper.idInfo)
        };
    }

    isHvd(): boolean {
        let isOpendata = this.baseMapper.getKeywords()?.some(keyword => ['opendata', 'opendataident'].includes(keyword));
        let descriptiveKeywordsElems = CswMapper.select('./*/gmd:descriptiveKeywords/gmd:MD_Keywords', this.baseMapper.idInfo);
        if (isOpendata && descriptiveKeywordsElems?.length > 0) {
            for (let descriptiveKeywordsElem of descriptiveKeywordsElems) {
                let thesaurusName = this.text("./gmd:thesaurusName/gmd:CI_Citation/gmd:title/*[self::gco:CharacterString or self::gmx:Anchor]", descriptiveKeywordsElem);
                let keywords = CswMapper.select('./gmd:keyword', descriptiveKeywordsElem);
                if (thesaurusName?.toLowerCase()?.startsWith('high-value') && keywords?.length > 0) {
                    return true;
                }
            }
        }
        return false;
    }

    private getReferenceSystems(): string[] {
        let rsIdentifiers = CswMapper.select("./gmd:referenceSystemInfo/gmd:MD_ReferenceSystem/gmd:referenceSystemIdentifier/gmd:RS_Identifier", this.baseMapper.record);
        return rsIdentifiers?.map(rsIdentifier => {
            let code = this.text("./gmd:code/gco:CharacterString", rsIdentifier);
            let codeSpace = this.text("../gmd:codeSpace/gco:CharacterString", rsIdentifier);
            return codeSpace ? `${codeSpace}:${code}` : code;
        });
    }

    getSpatialSystem() {
        return {
            referencesystem_value: this.getReferenceSystems()
        };
    }

    private getSingleEntryOrArray(result){
        if (result?.length > 1) return result;
        if (result?.length == 1) return result[0]
        return undefined;
    }

    async getDistributions(): Promise<Distribution[]> {
        let distributions = await this.baseMapper.getDistributions();
        return distributions?.filter(distribution => distribution.accessURL);
/*

        let result = []

        let operationNodes = CswMapper.select("./srv:SV_ServiceIdentification/srv:containsOperations/srv:SV_OperationMetadata", this.baseMapper.idInfo);

        for (let operationNode of operationNodes){
            let operationName = this.text("./srv:operationName/gco:CharacterString", operationNode);
            let operationServiceUrl = this.text("./srv:connectPoint/gmd:CI_OnlineResource/gmd:linkage/gmd:URL", operationNode);
            if(operationName?.toLowerCase() === 'getcapabilities') {
                result.push({
                    accessUrl : operationServiceUrl
                })
            }
        }

        return result
 */
    }

    private text(path: string, node: Element) {
        return CswMapper.select(path, node, true)?.textContent;
    }
}
