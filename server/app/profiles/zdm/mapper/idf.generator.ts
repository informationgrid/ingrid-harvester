/*
 * **************************************************-
 * ingrid-iplug-wfs-dsc:war
 * ==================================================
 * Copyright (C) 2014 - 2025 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or – as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 * 
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 * 
 * https://joinup.ec.europa.eu/software/page/eupl
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * **************************************************#
 */

import * as MiscUtils from '../../../utils/misc.utils';
import * as XPathUtils from '../../../utils/xpath.utils';
import { IdfGenerator as AbstractIdfGenerator } from '../../ingrid/idf.generator';
import { WfsMapper } from '../../../importer/wfs/wfs.mapper';

export class IdfGenerator extends AbstractIdfGenerator {

    private mapper: WfsMapper;
    private plugDescrDataSourceName: string;
    private plugDescrOrganisation: string;

    private feature: Node;

    constructor(mapper: WfsMapper) {
        super();
        this.mapper = mapper;
        this.feature = XPathUtils.firstElementChild(this.mapper.featureOrFeatureType);
        let idfBody = '<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.portalu.de/IDF/1.0"><head/><body/></html>';
        this.document = MiscUtils.getDomParser().parseFromString(idfBody);
        ({ dataSourceName: this.plugDescrDataSourceName, description: this.plugDescrOrganisation } = mapper.settings);
    }

    xpath(path: string, parent: Node = this.feature, single?: true) {
        return this.mapper.select(path, parent, single);
    }

    createIdf(idx?: number): string {
        if (this.mapper.isFeatureType()) {
            return this.createFeatureTypeIdf();
        }
        else {
            return this.createFeatureIdf(idx);
        }
    }

    createFeatureTypeIdf(): string {
        let idfBody = this.document.getElementsByTagName('body')[0];

        var detail = this.addOutputWithAttributes(idfBody, "section", ["class", "id"], ["detail", "detail"]);

        // header
        var header = this.addDetailHeaderWrapperNewLayout(detail);

        // header back to search
        this.addDetailHeaderWrapperNewLayoutBackSearch(header);

        // header title
        this.addDetailHeaderWrapperNewLayoutTitle(header, this.mapper.getTitle());

        // detail content

        var detailNavContent = this.addOutputWithAttributes(detail, "section", ["class"], ["row nav-content search-filtered"]);

        // navigation
        let withinFeatureLimit = this.mapper.getNumberOfFeatures() < this.mapper.settings.featureLimit;
        this.addDetailHeaderWrapperNewLayoutDetailNavigation(detailNavContent, this.mapper.getDescription(), null, withinFeatureLimit, this.plugDescrDataSourceName, this.plugDescrOrganisation);

        // content
        this.addOutputWithAttributes(detailNavContent, "a", ["class", "id"], ["anchor", "detail_overview"]);

        detailNavContent = this.addOutputWithAttributes(detailNavContent, "div", ["class"], ["xsmall-24 large-18 xlarge-18 columns"]);

        var detailNavContentData = this.addOutputWithAttributes(detailNavContent, "div", ["class"], ["data"]);
        detailNavContentData = this.addOutputWithAttributes(detailNavContentData, "div", ["class"], ["teaser-data search row is-active"]);

        var detailNavContentDataLeft = this.addOutputWithAttributes(detailNavContentData, "div", ["class"], ["xsmall-24 small-24 medium-14 large-14 xlarge-14 columns"]);
        //add the bounding box
        var boundingBox = this.mapper.getBoundingBox()?.bbox;
        if (boundingBox) {
            let [ x1, y1, x2, y2 ] = this.mapper.getBoundingBox().bbox;
            this.addOutput(detailNavContentDataLeft, "h4", "Ort:");
            this.addDetailTableRowWrapperNewLayout(detailNavContentDataLeft, "Nord", y2);
            this.addDetailTableRowWrapperNewLayout(detailNavContentDataLeft, "West", x1);
            this.addDetailTableRowWrapperNewLayout(detailNavContentDataLeft, "Ost", x2);
            this.addDetailTableRowWrapperNewLayout(detailNavContentDataLeft, "S&uuml;d", y1);
        }

        // let n = (this.mapper as ZdmWfsMapper).getName();
        let featureMapPreview = this.getMapPreview(this.mapper.getTypename(false));
        if(featureMapPreview) {
            var dataMap = "<div class=\"xsmall-24 small-24 medium-10 columns\">";
            dataMap += "<h4 class=\"text-center\">Vorschau</h4>";
            dataMap += "<div class=\"swiper-container-background\"><div class=\"swiper-slide\"><div class=\"caption\"><div class=\"preview_image\">";
            dataMap += featureMapPreview;
            dataMap += "</div></div></div></div></div>";
            detailNavContentData.appendChild(this.document.createTextNode(dataMap));
        }

        let summary = this.getFeatureTypeSummary();
        if(summary) {
            var detailNavContentSection = this.addOutputWithAttributes(detailNavContent, "div", ["class"], ["section"]);
            this.addOutputWithAttributes(detailNavContentSection, "a", ["class", "id"], ["anchor", "detail_description"]);
            this.addOutput(detailNavContentSection, "h3", "Beschreibung");
            var result = this.addOutputWithAttributes(detailNavContentSection, "div", ["class"], ["row columns"]);
            this.addOutput(result, "p", summary);
        }

        var detailNodes = this.mapper.select("//*/*[local-name()='extension'][@base='gml:AbstractFeatureType']/*[local-name()='sequence']/*[local-name()='element']", this.mapper.featureTypeDescription);
        if(detailNodes.length > 0) {
            var detailNavContentSection = this.addOutputWithAttributes(detailNavContent, "div", ["class"], ["section"]);
            this.addOutputWithAttributes(detailNavContentSection, "a", ["class", "id"], ["anchor", "detail_details"]);
            this.addOutput(detailNavContentSection, "h3", "Details");
            this.addDetailTableListWrapperNewLayout(detailNavContentSection, "Feature Attribute", detailNodes);
        }

        // // show features, if loaded
        // var features: ZdmIndexDocument[] = this.mapper.getFeatures();
        if (this.mapper.getNumberOfFeatures() < this.mapper.settings.featureLimit) {
            var detailNavContentSection = this.addOutputWithAttributes(detailNavContent, "div", ["class"], ["section"]);
            this.addOutputWithAttributes(detailNavContentSection, "a", ["class", "id"], ["anchor", "detail_features"]);
            this.addOutput(detailNavContentSection, "h3", "Features");
            var resultColumn = this.addOutputWithAttributes(detailNavContentSection, "div", ["class"], ["row columns"]);
            // NOTE: the below section is filled in server/app/profiles/zdm/persistence/postgres.aggregator.ts
        //     for (var j=0; j<features.length; j++) {
        //     //     var recordNode = features.get(j).getOriginalResponse().get(0);
        //     //     var result = this.addOutputWithAttributes(resultColumn, "div", ["class"], ["sub-section"]);

        //     //     // add the title
        //     //     this.addOutput(result, "h3", this.mapper.getTitle());

        //     //     //add the summary
        //     //     this.addOutput(result, "p", this.getFeatureSummary());

        //     //     //add the bounding box
        //     //     if (boundingBox) {
        //     //         result = this.addOutputWithAttributes(resultColumn, "div", ["class"], ["sub-section"]);
        //     //         let [ x1, y1, x2, y2 ] = this.mapper.getBoundingBox().bbox;
        //     //         this.addOutput(result, "h4", "Ort:");
        //     //         this.addDetailTableRowWrapperNewLayout(result, "Nord", y2);
        //     //         this.addDetailTableRowWrapperNewLayout(result, "West", x1);
        //     //         this.addDetailTableRowWrapperNewLayout(result, "Ost", x2);
        //     //         this.addDetailTableRowWrapperNewLayout(result, "S&uuml;d", y1);
        //     //     }

        //     //     // add the map preview
        //     //     result = this.addOutputWithAttributes(resultColumn, "div", ["class"], ["sub-section"]);
        //     //     this.addOutput(result, "div", this.getFeatureMapPreview(recordNode, wfsRecord.getName() + "_" + j));

        //     //     // add details (content of all child nodes)
        //     //     var detailNodes = recordNode.getChildNodes();
        //     //     if (this.hasValue(detailNodes)) {
        //     //         result = this.addOutputWithAttributes(resultColumn, "div", ["class"], ["sub-section"]);
        //     //         for (var i=0, count=detailNodes.length; i<count; i++) {
        //     //             var detailNode = detailNodes.item(i);
        //     //             var nodeName = detailNode.getLocalName();
        //     //             if (this.hasValue(nodeName)) {
        //     //                 this.addDetailTableRowWrapperNewLayout(result, nodeName, detailNode.getTextContent());
        //     //             }
        //     //         }
        //     //     }
        //         result += features[j].idf;
        //     }
        }

        if(this.plugDescrDataSourceName || this.plugDescrOrganisation) {
            var detailNavContentSection = this.addOutputWithAttributes(detailNavContent, "div", ["class"], ["section"]);
            this.addOutputWithAttributes(detailNavContentSection, "a", ["class", "id"], ["anchor", "metadata_info"]);
            this.addOutput(detailNavContentSection, "h3", "Informationen zum Metadatensatz");
            var result = this.addOutputWithAttributes(detailNavContentSection, "div", ["class"], ["table table--lined"]);
            result = this.addOutput(result, "table", "");
            result = this.addOutput(result, "tbody", "");
            result = this.addOutput(result, "tr", "");
            this.addOutput(result, "th", "Metadatenquelle");
            result = this.addOutput(result, "td", "");
            if(this.plugDescrDataSourceName) {
                this.addOutput(result, "p", this.plugDescrDataSourceName);
                this.addOutput(result, "span", "&nbsp;");
            }
            if(this.plugDescrOrganisation) {
                this.addOutput(result, "p", this.plugDescrOrganisation);
            }
        }

        return this.document.toString();
    }

    createFeatureIdf(idx: number): string {
        let resultColumn = this.document.createElement("div");
        resultColumn.setAttribute("class", "row columns");
        var result = this.addOutputWithAttributes(resultColumn, "div", ["class"], ["sub-section"]);

        // add the title
        this.addOutput(result, "h3", this.mapper.getGeneratedId());//this.mapper.getTitle());

        //add the summary
        this.addOutput(result, "p", this.getFeatureSummary());

        //add the bounding box
        // let boundingBox = this.mapper.getBoundingBox()?.bbox;
        let boundingBox = this.mapper.getOriginalBoundingBox();
        if (boundingBox) {
            result = this.addOutputWithAttributes(resultColumn, "div", ["class"], ["sub-section"]);
            // let [ x1, y1, x2, y2 ] = boundingBox;
            let [x1, y1] = boundingBox.lowerCorner.split(" ").map(coord => coord.trim());
            let [x2, y2] = boundingBox.upperCorner.split(" ").map(coord => coord.trim());
            // let points = GeoJsonUtils.project(x1, y1, 'WGS84', this.mapper.featureOrFeatureType);
            this.addOutput(result, "h4", "Ort:");
            this.addDetailTableRowWrapperNewLayout(result, "Nord", y2);
            this.addDetailTableRowWrapperNewLayout(result, "West", x1);
            this.addDetailTableRowWrapperNewLayout(result, "Ost", x2);
            this.addDetailTableRowWrapperNewLayout(result, "S&uuml;d", y1);
        }

        // add the map preview
        result = this.addOutputWithAttributes(resultColumn, "div", ["class"], ["sub-section"]);
        let name = this.mapper.getTypename() + '_' + idx;
        this.addOutput(result, "div", this.getMapPreview(name));

        // // add details (content of all child nodes)
        // var detailNodes = recordNode.getChildNodes();
        // if (this.hasValue(detailNodes)) {
        //     result = this.addOutputWithAttributes(resultColumn, "div", ["class"], ["sub-section"]);
        //     for (var i=0, count=detailNodes.length; i<count; i++) {
        //         var detailNode = detailNodes.item(i);
        //         var nodeName = detailNode.getLocalName();
        //         if (this.hasValue(nodeName)) {
        //             this.addDetailTableRowWrapperNewLayout(result, nodeName, detailNode.getTextContent());
        //         }
        //     }
        // }

        // var detail = this.addOutputWithAttributes(idfBody, "section", ["class", "id"], ["detail", "detail"]);

        // // header
        // var header = this.addDetailHeaderWrapperNewLayout(detail);

        // // header back to search
        // this.addDetailHeaderWrapperNewLayoutBackSearch(header);

        // // header title
        // this.addDetailHeaderWrapperNewLayoutTitle(header, this.mapper.getTitle());

        // // detail content

        // var detailNavContent = this.addOutputWithAttributes(detail, "section", ["class"], ["row nav-content search-filtered"]);

        // // navigation
        // this.addDetailHeaderWrapperNewLayoutDetailNavigation(detailNavContent, this.mapper.getDescription(), this.feature.childNodes, undefined, this.plugDescrDataSourceName, this.plugDescrOrganisation);

        // // content
        // this.addOutputWithAttributes(detailNavContent, "a", ["class", "id"], ["anchor", "detail_overview"]);

        // detailNavContent = this.addOutputWithAttributes(detailNavContent, "div", ["class"], ["xsmall-24 large-18 xlarge-18 columns"]);

        // var detailNavContentData = this.addOutputWithAttributes(detailNavContent, "div", ["class"], ["data"]);
        // detailNavContentData = this.addOutputWithAttributes(detailNavContentData, "div", ["class"], ["teaser-data search row is-active"]);

        // var detailNavContentDataLeft = this.addOutputWithAttributes(detailNavContentData, "div", ["class"], ["xsmall-24 small-24 medium-14 large-14 xlarge-14 columns"]);
        // //add the bounding box
        // var boundingBox = this.mapper.getBoundingBox()?.bbox;
        // if (boundingBox) {
        //     let [ x1, y1, x2, y2 ] = this.mapper.getBoundingBox().bbox;
        //     this.addOutput(detailNavContentDataLeft, "h4", "Ort:");
        //     this.addDetailTableRowWrapperNewLayout(detailNavContentDataLeft, "Nord", y2);
        //     this.addDetailTableRowWrapperNewLayout(detailNavContentDataLeft, "West", x1);
        //     this.addDetailTableRowWrapperNewLayout(detailNavContentDataLeft, "Ost", x2);
        //     this.addDetailTableRowWrapperNewLayout(detailNavContentDataLeft, "S&uuml;d", y1);
        // }

        // let featureMapPreview = this.getMapPreview(this.xpath("//ms:OBJEKT_ID")?.textContent);
        // if(featureMapPreview) {
        //     var dataMap = "<div class=\"xsmall-24 small-24 medium-10 columns\">";
        //     dataMap += "<h4 class=\"text-center\">Vorschau</h4>";
        //     dataMap += "<div class=\"swiper-container-background\"><div class=\"swiper-slide\"><div class=\"caption\"><div class=\"preview_image\">";
        //     dataMap += featureMapPreview;
        //     dataMap += "</div></div></div></div></div>";
        //     detailNavContentData.appendChild(this.document.createTextNode(dataMap));
        // }

        // let summary = this.getFeatureSummary();
        // if(summary) {
        //     var detailNavContentSection = this.addOutputWithAttributes(detailNavContent, "div", ["class"], ["section"]);
        //     this.addOutputWithAttributes(detailNavContentSection, "a", ["class", "id"], ["anchor", "detail_description"]);
        //     this.addOutput(detailNavContentSection, "h3", "Beschreibung");
        //     var result = this.addOutputWithAttributes(detailNavContentSection, "div", ["class"], ["row columns"]);
        //     this.addOutput(result, "p", summary);
        // }

        // var detailNodes = Array.from(this.feature.childNodes);
        // if(detailNodes.length > 0) {
        //     var detailNavContentSection = this.addOutputWithAttributes(detailNavContent, "div", ["class"], ["section"]);
        //     this.addOutputWithAttributes(detailNavContentSection, "a", ["class", "id"], ["anchor", "detail_details"]);
        //     this.addOutput(detailNavContentSection, "h3", "Details");
        //     this.addDetailTableListWrapperNewLayout(detailNavContentSection, "Feature Attribute", detailNodes);
        // }

        // if(this.plugDescrDataSourceName || this.plugDescrOrganisation) {
        //     var detailNavContentSection = this.addOutputWithAttributes(detailNavContent, "div", ["class"], ["section"]);
        //     this.addOutputWithAttributes(detailNavContentSection, "a", ["class", "id"], ["anchor", "metadata_info"]);
        //     this.addOutput(detailNavContentSection, "h3", "Informationen zum Metadatensatz");
        //     var result = this.addOutputWithAttributes(detailNavContentSection, "div", ["class"], ["table table--lined"]);
        //     result = this.addOutput(result, "table", "");
        //     result = this.addOutput(result, "tbody", "");
        //     result = this.addOutput(result, "tr", "");
        //     this.addOutput(result, "th", "Metadatenquelle");
        //     result = this.addOutput(result, "td", "");
        //     if(this.hasValue(this.plugDescrDataSourceName)) {
        //         this.addOutput(result, "p", this.plugDescrDataSourceName);
        //         this.addOutput(result, "span", "&nbsp;");
        //     }
        //     if(this.hasValue(this.plugDescrOrganisation)) {
        //         this.addOutput(result, "p", this.plugDescrOrganisation);
        //     }
        // }

        return resultColumn.toString();
    }

    getFeatureTypeSummary() {
        var summary = this.mapper.getDescription();
        var name = this.mapper.getTypename(false);
        var portal = "Küstendaten";
        var featureSummary = "WebFeatureService (WFS) " + portal + ", FeatureType: " + name + "<br>";
        featureSummary += "Dieser FeatureType umfasst <b>" + this.mapper.getNumberOfFeatures() + "</b> Feature(s).<br>";
        if(this.hasValue(summary)) {
            featureSummary += summary + "<br>";
        }
        return featureSummary;
    }

    getFeatureSummary() {
        let { lowerCorner, upperCorner, crs } = this.mapper.getOriginalBoundingBox();
        if (lowerCorner) {
            // west, south / east, north
            // let [ x1, y1, x2, y2 ] = boundingBox?.bbox;
            // return x1 + ", " + y1 + " / " + x2 + ", " + y2;
            let [x1, y1] = lowerCorner.split(" ").map(coord => coord.trim());
            let [x2, y2] = upperCorner.split(" ").map(coord => coord.trim());
            return `${crs}: ${y1}, ${x1} / ${y2}, ${x2}`;
        }
        return "";
    }

    // getFeatureMapPreview(name) {
    //     // let bbox = this.mapper.getBoundingBox().bbox;
    //     // var gmlEnvelope = this.xpath(recordNode, "//gml:boundedBy/gml:Envelope");
    //     // if (hasValue(gmlEnvelope)) {
    //     //     // BBOX
    //     //     var lowerCoords = xPathUtils.getString(gmlEnvelope, "gml:lowerCorner").split(" ");
    //     //     var upperCoords = xPathUtils.getString(gmlEnvelope, "gml:upperCorner").split(" ");

    //     //     return getMapPreview(name, this.getTitle(), lowerCoords, upperCoords, false);
    //     // }
    //     return this.getMapPreview(name, this.mapper.getTitle(), bbox, this.mapper.isFeatureType());
    // }

    getMapPreview(name) {
        let title = this.mapper.isFeatureType() ? this.mapper.getTitle() : this.mapper.getGeneratedId();
        let bbox = this.mapper.getBoundingBox()?.bbox;
        // let isWGS84 = this.mapper.isFeatureType();
        var srsName = "EPSG:25832";
        // Latitude first (Breitengrad = y), longitude second (Laengengrad = x)
        let [ y1, x1, y2, x2 ] = bbox.map(Number);

        var marker = "";
        if (x1 === x2 && y1 === y2) {
            marker = 'L.marker(['+ x1 +', ' + y1 +'],' +
                '{ icon: L.icon({ iconUrl: "/DE/dienste/ingrid-webmap-client/frontend/prd/img/marker.png" }) })';
            y1 = y1 - 0.048;
            x1 = x1 - 0.012;
            y2 = y2 + 0.048;
            x2 = x2 + 0.012;
        }
        var BBOX = "[" + x1 + "," + y1 + "],[" + x2 + "," + y2 + "]";

        var height = this.mapper.isFeatureType() ? 280 : 160;

        var addHtml = '' +
        ' <div id="map_' + name + '" style="height: '+ height + 'px;"></div>' +
        ' <script>' +
        'var map_' + name + ' = addLeafletMapWithId(\'map_' + name + '\', getOSMLayer(\'\'), [ ' + BBOX + ' ], null , 10);';

        if(marker !== '') {
            addHtml = addHtml +  marker +
                '.bindTooltip("'+ title + '", {direction: "center"})' +
                '.addTo(map_' + name + ' );'
        } else {
            addHtml = addHtml + 'map_' + name + '.addLayer(L.rectangle([ ' + BBOX + ' ], {color: "#156570", weight: 1})' +
                '.bindTooltip("'+ title + '", {direction: "center"}));';
        }
        addHtml = addHtml + 'map_' + name + '.gestureHandling.enable();' +
            'addLeafletHomeControl(map_' + name + ', \'Zoom auf initialen Kartenausschnitt\', \'topleft\', \'ic-ic-center\', [ ' + BBOX + ' ], \'\', \'23px\');'
        addHtml = addHtml + '</script>';

        this.mapper.log.debug("MapPreview Html: " + addHtml);

        return addHtml;
    }
}