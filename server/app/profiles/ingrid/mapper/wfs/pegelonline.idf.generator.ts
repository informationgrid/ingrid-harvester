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

import type { WfsMapper } from "../../../../importer/wfs/wfs.mapper.js";
import { IdfGenerator } from "../../idf.generator.js";
import type { PegelonlineWfsMapper } from './pegelonline.wfs.mapper.js';

export class PegelonlineIdfGenerator extends IdfGenerator {

    private mapper: PegelonlineWfsMapper;
    private baseMapper: WfsMapper;

    constructor(profileMapper: PegelonlineWfsMapper) {
        super();
        this.mapper = profileMapper;
        this.baseMapper = profileMapper.baseMapper;
        let idfBody = '<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.portalu.de/IDF/1.0"><head/><body/></html>';
        this.document = this.domParser.parseFromString(idfBody);
    }

    createIdf(): string {
        // if (this.mapper.isFeatureType()) {
        //     return this.createFeatureTypeIdf();
        // }
        // else {
        //     return this.createFeatureIdf(idx);
        // }
        return this.createFeatureIdf();
    }

    createFeatureIdf(): string {
        var plugDescrDataSourceName = this.baseMapper.settings.dataSourceName;
        var plugDescrOrganisation = this.mapper.getOrganisation();

        //---------- <idf:body> ----------
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
        this.addDetailHeaderWrapperNewLayoutDetailNavigation(detailNavContent, this.mapper.getSummary(), null, undefined, plugDescrDataSourceName, plugDescrOrganisation)

        // content
        this.addOutputWithAttributes(detailNavContent, "a", ["class", "id"], ["anchor", "detail_overview"]);

        detailNavContent = this.addOutputWithAttributes(detailNavContent, "div", ["class"], ["xsmall-24 large-18 xlarge-18 columns"]);

        var detailNavContentData = this.addOutputWithAttributes(detailNavContent, "div", ["class"], ["data"]);
        detailNavContentData = this.addOutputWithAttributes(detailNavContentData, "div", ["class"], ["teaser-data search row is-active"]);

        var detailNavContentDataLeft = this.addOutputWithAttributes(detailNavContentData, "div", ["class"], ["xsmall-24 small-24 medium-14 large-14 xlarge-14 columns"]);
        //add the bounding box
        let boundingBox = this.baseMapper.getOriginalBoundingBox();
        if (boundingBox)  {
            let [y1, x1] = boundingBox.lowerCorner.split(" ").map(coord => coord.trim());
            let [y2, x2] = boundingBox.upperCorner.split(" ").map(coord => coord.trim());
            this.addOutput(detailNavContentDataLeft, "h4", "Ort:");
            this.addDetailTableRowWrapperNewLayout(detailNavContentDataLeft, "Nord", y2);
            this.addDetailTableRowWrapperNewLayout(detailNavContentDataLeft, "West", x1);
            this.addDetailTableRowWrapperNewLayout(detailNavContentDataLeft, "Ost", x2);
            this.addDetailTableRowWrapperNewLayout(detailNavContentDataLeft, "S&uuml;d", y1);
        }

        let mapPreview = this.getMapPreview();
        if (mapPreview) {
            var dataMap = "<div class=\"xsmall-24 small-24 medium-10 columns\">";
            dataMap += "<h4 class=\"text-center\">Vorschau</h4>";
            dataMap += "<div class=\"swiper-container-background\"><div class=\"swiper-slide\"><div class=\"caption\"><div class=\"preview_image\">";
            dataMap += mapPreview;
            dataMap += "</div></div></div></div></div>";
            let dataMapElement = this.domParser.parseFromString(dataMap);
            detailNavContentData.appendChild(dataMapElement);
        }

        if (this.mapper.getSummary()) {
            var detailNavContentSection = this.addOutputWithAttributes(detailNavContent, "div", ["class"], ["section"]);
            this.addOutputWithAttributes(detailNavContentSection, "a", ["class", "id"], ["anchor", "detail_description"]);
            this.addOutput(detailNavContentSection, "h3", "Beschreibung");
            var result = this.addOutputWithAttributes(detailNavContentSection, "div", ["class"], ["row columns"]);
            result = this.addOutput(result, "p", this.mapper.getSummary());
        }

        // let detailNodes = this.baseMapper.select("//*/*[local-name()='extension'][@base='gml:AbstractFeatureType']/*[local-name()='sequence']/*[local-name()='element']", this.baseMapper.featureTypeDescription);
        // if (detailNodes.length > 0) {
        //     let entries = this.mapper.getCustomEntries();
        //     var detailNavContentSection =this.addOutputWithAttributes(detailNavContent, "div", ["class"], ["section"]);
        //     this.addOutputWithAttributes(detailNavContentSection, "a", ["class", "id"], ["anchor", "detail_details"]);
        //     this.addOutput(detailNavContentSection, "h3", "Details");
        //     this.addDetailTableRowWrapperNewLayout(detailNavContentSection, "Gewässer", entries["water"]);
        //     this.addDetailTableRowWrapperNewLayout(detailNavContentSection, "Station", entries["station"]);
        //     this.addDetailTableRowWrapperNewLayout(detailNavContentSection, "Station ID", entries["station_id"]);
        //     this.addDetailTableRowWrapperNewLayout(detailNavContentSection, "Kilometer", entries["kilometer"]);
        //     this.addDetailTableRowWrapperNewLayout(detailNavContentSection, "Datum", entries["date"]);
        //     this.addDetailTableRowWrapperNewLayout(detailNavContentSection, "Wert", entries["value"]);
        //     this.addDetailTableRowWrapperNewLayout(detailNavContentSection, "Einheit", entries["unit"]);
        //     this.addDetailTableLinkRowWrapperNewLayout(detailNavContentSection, "Chart", entries["chart_url"], entries["chart_url"]);
        //     this.addDetailTableRowWrapperNewLayout(detailNavContentSection, "Trend", this.baseMapper.getTextContent("/gk:waterlevels/gk:trend"));
        //     this.addDetailTableRowWrapperNewLayout(detailNavContentSection, "Status", entries["status"]);
        //     this.addDetailTableRowWrapperNewLayout(detailNavContentSection, "Kommentar", this.baseMapper.getTextContent("/gk:waterlevels/gk:comment"));
        // }

        if (this.hasValue(plugDescrDataSourceName) || this.hasValue(plugDescrOrganisation)) {
            var detailNavContentSection = this.addOutputWithAttributes(detailNavContent, "div", ["class"], ["section"]);
            this.addOutputWithAttributes(detailNavContentSection, "a", ["class", "id"], ["anchor", "metadata_info"]);
            this.addOutput(detailNavContentSection, "h3", "Informationen zum Metadatensatz");
            var result = this.addOutputWithAttributes(detailNavContentSection, "div", ["class"], ["table table--lined"]);
            result = this.addOutput(result, "table", "");
            result = this.addOutput(result, "tbody", "");
            result = this.addOutput(result, "tr", "");
            this.addOutput(result, "th", "Metadatenquelle");
            result = this.addOutput(result, "td", "");
            if (this.hasValue(plugDescrDataSourceName)) {
                this.addOutput(result, "p", plugDescrDataSourceName);
                this.addOutput(result, "span", "&nbsp;");
            }
            if (this.hasValue(plugDescrOrganisation)) {
                this.addOutput(result, "p", plugDescrOrganisation);
            }
        }

        return this.document.toString();
    }

    getMapPreview() {
        let id = this.mapper.getGeneratedId();
        if (id == "45634232-36ac-416c-806d-5f64201dae2c") {
            let v = "hello";
        }

        let boundingBox = this.baseMapper.getOriginalBoundingBox();
        if (!boundingBox)  {
            return '';
        }

        var addHtml = '';
        let [y1, x1] = boundingBox.lowerCorner.split(" ").map(coord => coord.trim());
        let [y2, x2] = boundingBox.upperCorner.split(" ").map(coord => coord.trim());

        var marker = '';

        if (x1 === x2 && y1 === y2) {
            marker = 'L.marker(['+ y1 +', ' + x1 +'])';
        }
        var BBOX = '[' + y1 + ',' + x1 + '],[' + y2 + ',' + x2 + ']';

        var height = 280;

        addHtml += '' +
        ' <div id="map" style="height: '+ height + 'px;"></div>' +
        ' <script>' + 
        'var map = addLeafletMapWithId(\'map\', getOSMLayer(\'\'), [ ' + BBOX + ' ], null , 10);';

        if (marker !== '') {
            addHtml = addHtml +  marker + 
                '.bindTooltip("'+ this.mapper.getTitle() + '", {direction: "center"})' +
                '.addTo(map);'
        } else {
            addHtml = addHtml + 'map.addLayer(L.rectangle([ ' + BBOX + ' ], {color: "#156570", weight: 1})' +
                '.bindTooltip("'+ this.mapper.getTitle() + '", {direction: "center"}));';
        }
        addHtml = addHtml + 'map.gestureHandling.enable();' +
            'addLeafletHomeControl(map, \'Zoom auf initialen Kartenausschnitt\', \'topleft\', \'ic-ic-center\', [ ' + BBOX + ' ], \'\', \'23px\');' 
        addHtml = addHtml + '</script>';

        this.baseMapper.log.debug("MapPreview Html: " + addHtml);
        return addHtml;
    }
}