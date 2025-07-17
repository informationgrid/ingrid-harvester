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

import * as GeoJsonUtils from '../../../utils/geojson.utils';
import * as MiscUtils from '../../../utils/misc.utils';
import * as XPathUtils from '../../../utils/xpath.utils';
import { WfsMapper } from '../../../importer/wfs/wfs.mapper';

export class IdfDocument {

    private mapper: WfsMapper;
    private plugDescrDataSourceName: string;
    private plugDescrOrganisation: string;

    private document: Document;
    private feature: Node;

    constructor(mapper: WfsMapper) {
        this.mapper = mapper;
        this.feature = XPathUtils.firstElementChild(this.mapper.featureOrFeatureType);
        let idfBody = '<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.portalu.de/IDF/1.0"><head/><body/></html>';
        this.document = MiscUtils.getDomParser().parseFromString(idfBody);
        ({ dataSourceName: this.plugDescrDataSourceName, description: this.plugDescrOrganisation } = mapper.settings);
    }

    xpath(path: string, parent: Node = this.feature, single?: true) {
        return this.mapper.select(path, parent, single);
    }

    createIdf(): string {
        if (this.mapper.isFeatureType()) {
            return this.createFeatureTypeIdf();
        }
        else {
            return this.createFeatureIdf();
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
        this.addDetailHeaderWrapperNewLayoutDetailNavigation(detailNavContent, this.mapper.getDescription(), null, this.plugDescrDataSourceName, this.plugDescrOrganisation);

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

    createFeatureIdf(): string {
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
        this.addOutput(result, "div", this.getMapPreview(this.mapper.uuid));

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

    addOutput(parent: Element, elementName, textContent) {
        var element = this.document.createElement(elementName);
        if (textContent != undefined) {
            element.appendChild(this.document.createTextNode(textContent));
        }
        parent.appendChild(element);
        return element;
    }

    addOutputWithLinks(parent, elementName, textContent) {
        var element = this.document.createElement(elementName);
        if (textContent != undefined) {
            // tokenize string and create links if necessary
            var words = textContent.split(" ");
            for (var i=0, count=words.length; i<count; i++) {
                var text = words[i];
                
                // add a link for an url
                if (this.isUrl(text)) {
                    this.addLink(element, text, text, "_blank");
                }
                // add a mailto link for an email address
                else if (this.isEmail(text)) {
                    this.addLink(element, text, "mailto:"+text);
                }
                // default: add the plain text
                else {
                    element.appendChild(this.document.createTextNode(text));
                }

                // add space
                if (i<count-1) {
                    element.appendChild(this.document.createTextNode(" "));
                }
            }
        }
        parent.appendChild(element);
        return element;
    }

    addLink(parent, name, url, target?) {
        var link = this.document.createElement("a");
        link.setAttribute("href", url);
        if (target != undefined) {
            link.setAttribute("target", target);
        }
        link.appendChild(this.document.createTextNode(name));
        parent.appendChild(link);
        return link;
    }

    addOutputWithAttributes(parent, elementName, attrNames, attrValues) {
        var element = this.document.createElement(elementName);
        for (var i=0, count=attrNames.length; i<count; i++) {
            element.setAttribute(attrNames[i], attrValues[i]);
        }
        parent.appendChild(element);
        return element;
    }

    // add elements/styles for correct display in portal (header)
    addDetailHeaderWrapper(parent) {
        var result = this.addOutputWithAttributes(parent, "section", ["class"], ["block block--light block--pad-top"]);
        result = this.addOutputWithAttributes(result, "div", ["class"], ["ob-box-wide ob-box-padded ob-box-center"]);
        result = this.addOutputWithAttributes(result, "article", ["id", "class"], ["detail_meta_header", "content ob-container"]);
        result = this.addOutputWithAttributes(result, "form", ["class"], ["box box--medium"]);
        result = this.addOutputWithAttributes(result, "div", ["class"], ["box__content ob-container"]);
        return result;
    }

    //add elements/styles for correct display in portal (details)
    addDetailDetailsWrapper(parent) {
        var result = this.addOutputWithAttributes(parent, "section", ["id","class"], ["detail_meta","block"]);
        result = this.addOutputWithAttributes(result, "div", ["class"], ["ob-box-wide ob-box-padded ob-box-center ob-rel"]);
        result = this.addOutputWithAttributes(result, "article", ["class"], ["content ob-container ob-box-wide"]);
        result = this.addOutputWithAttributes(result, "form", ["class"], ["box box--medium"]);
        result = this.addOutputWithAttributes(result, "div", ["class"], ["box__content ob-container"]);
        return result;
    }

    /* New portal layout */ 

    // add elements/styles for correct display in portal (header)
    addDetailHeaderWrapperNewLayout(parent) {
        var result = this.addOutputWithAttributes(parent, "div", ["class"], ["banner-noimage m-filter"]);
        result = this.addOutputWithAttributes(result, "div", ["class", "style"], ["page-wrapper", "background-image: url('/decorations/layout/ingrid/images/template/drops-subpage.svg');"]);
        result = this.addOutputWithAttributes(result, "div", ["class"], ["row"]);
        return result;
    }

    addDetailHeaderWrapperNewLayoutBackSearch(parent) {
        var result = this.addOutputWithAttributes(parent, "section", ["class"], ["xsmall-24 large-6 xlarge-6 columns"]);
        var a = this.addOutputWithAttributes(result, "a", ["class", "href", "title"], ["helper icon", "/freitextsuche", "Alle Suchergebnisse"]);
        this.addOutputWithAttributes(a, "span", ["class"], ["ic-ic-arrow-left"]);
        var text = this.addOutputWithAttributes(a, "span", ["class"], ["text text-normal"]);
        text.appendChild(this.document.createTextNode("Alle Suchergebnisse"));
    }

    addDetailHeaderWrapperNewLayoutTitle(parent, title) {
        var result = this.addOutputWithAttributes(parent, "section", ["class"], ["xsmall-24 large-18 xlarge-18 columns"]);
        this.addOutput(result, "h2", title);
    }

    addDetailHeaderWrapperNewLayoutDetailNavigation(parent, summary, detail, source, organisation) {
        var result = this.addOutputWithAttributes(parent, "div", ["class"], ["xsmall-24 large-6 xlarge-6 columns"]);
        result = this.addOutputWithAttributes(result, "div", ["class", "data-accordion", "data-allow-all-closed", "role"], ["accordion accordion-filter-group filter", "", "true", "tablist"]);
        var filter = this.addOutputWithAttributes(result, "div", ["class", "data-accordion-item"], ["accordion-item accordion-item-filter-group", ""]);
        var a = this.addOutputWithAttributes(filter, "a", ["class", "href", "role", "id", "aria-expanded", "aria-selected", "aria-controls"], ["accordion-title accordion-title-filter-group hide-for-large", "#", "tab", "detail-content-accordion-label", "false", "false", "detail-content-accordion"]);
        this.addOutput(a, "span", "Inhalt");
        var filterContent = this.addOutputWithAttributes(filter, "div", ["class", "data-tab-content", "aria-hidden", "role", "aria-labelledby", "id", "tabindex"], ["accordion-content filter-wrapper", "", "true", "tabpanel", "detail-content-accordion-label", "detail-content-accordion", "1"]);
        var filterList = this.addOutputWithAttributes(filterContent, "ul", ["class", "data-accordion", "data-allow-all-closed", "role"], ["accordion filter-group nav-group", "", "true", "tablist"]);
        
        var filterEntry = this.addOutputWithAttributes(filterList, "li", ["class", "data-accordion-item"], ["accordion-item ", ""]);
        var filterEntryHref = this.addOutputWithAttributes(filterEntry, "a", ["class", "href", "role", "id", "aria-expanded", "aria-selected", "aria-controls"], ["accordion-title js-anchor-target", "#detail_overview", "tab", "detail_overview-accordion-label", "false", "false", "detail_overview-accordion"]);
        this.addOutput(filterEntryHref, "span", "Übersicht");
        var filterEntrySub = this.addOutputWithAttributes(filterEntry, "div", ["class", "data-tab-content", "role", "id", "aria-hidden", "aria-labelledby"], ["accordion-content is-hidden", "", "tab", "detail_overview-accordion", "true", "detail_overview-accordion-label"]);
        this.addOutputWithAttributes(filterEntrySub, "div", ["class"], ["boxes"]);
        
        if(summary) {
            var filterEntry = this.addOutputWithAttributes(filterList, "li", ["class", "data-accordion-item"], ["accordion-item ", ""]);
            var filterEntryHref = this.addOutputWithAttributes(filterEntry, "a", ["class", "href", "role", "id", "aria-expanded", "aria-selected", "aria-controls"], ["accordion-title js-anchor-target", "#detail_description", "tab", "detail_description-accordion-label", "false", "false", "detail_description-accordion"]);
            this.addOutput(filterEntryHref, "span", "Beschreibung");
            var filterEntrySub = this.addOutputWithAttributes(filterEntry, "div", ["class", "data-tab-content", "role", "id", "aria-hidden", "aria-labelledby"], ["accordion-content is-hidden", "", "tab", "detail_description-accordion", "true", "detail_description-accordion-label"]);
            this.addOutputWithAttributes(filterEntrySub, "div", ["class"], ["boxes"]);
        }

        if(detail?.length > 0) {
            var filterEntry = this.addOutputWithAttributes(filterList, "li", ["class", "data-accordion-item"], ["accordion-item ", ""]);
            var filterEntryHref = this.addOutputWithAttributes(filterEntry, "a", ["class", "href", "role", "id", "aria-expanded", "aria-selected", "aria-controls"], ["accordion-title js-anchor-target", "#detail_details", "tab", "detail_details-accordion-label", "false", "false", "detail_details-accordion"]);
            this.addOutput(filterEntryHref, "span", "Details");
            var filterEntrySub = this.addOutputWithAttributes(filterEntry, "div", ["class", "data-tab-content", "role", "id", "aria-hidden", "aria-labelledby"], ["accordion-content is-hidden", "", "tab", "detail_details-accordion", "true", "detail_details-accordion-label"]);
            this.addOutputWithAttributes(filterEntrySub, "div", ["class"], ["boxes"]);
        }

        if(this.mapper.getNumberOfFeatures() < this.mapper.settings.featureLimit) {
            var filterEntry = this.addOutputWithAttributes(filterList, "li", ["class", "data-accordion-item"], ["accordion-item ", ""]);
            var filterEntryHref = this.addOutputWithAttributes(filterEntry, "a", ["class", "href", "role", "id", "aria-expanded", "aria-selected", "aria-controls"], ["accordion-title js-anchor-target", "#detail_features", "tab", "detail_features-accordion-label", "false", "false", "detail_features-accordion"]);
            this.addOutput(filterEntryHref, "span", "Features");
            var filterEntrySub = this.addOutputWithAttributes(filterEntry, "div", ["class", "data-tab-content", "role", "id", "aria-hidden", "aria-labelledby"], ["accordion-content is-hidden", "", "tab", "detail_features-accordion", "true", "detail_features-accordion-label"]);
            this.addOutputWithAttributes(filterEntrySub, "div", ["class"], ["boxes"]);
        }

        if(this.hasValue(source) || this.hasValue(organisation)) {
            var filterEntry = this.addOutputWithAttributes(filterList, "li", ["class", "data-accordion-item"], ["accordion-item ", ""]);
            var filterEntryHref = this.addOutputWithAttributes(filterEntry, "a", ["class", "href", "role", "id", "aria-expanded", "aria-selected", "aria-controls"], ["accordion-title js-anchor-target", "#metadata_info", "tab", "metadata_info-accordion-label", "false", "false", "metadata_info-accordion"]);
            this.addOutput(filterEntryHref, "span", "Metadatensatz");
            var filterEntrySub = this.addOutputWithAttributes(filterEntry, "div", ["class", "data-tab-content", "role", "id", "aria-hidden", "aria-labelledby"], ["accordion-content is-hidden", "", "tab", "metadata_info-accordion", "true", "metadata_info-accordion-label"]);
            this.addOutputWithAttributes(filterEntrySub, "div", ["class"], ["boxes"]);
        }
    }

    addDetailTableRowWrapperNewLayout (parent, title, content) {
        var result = this.addOutputWithAttributes(parent, "div", ["class"], ["table table--lined"]);
        result = this.addOutput(result, "table", "");
        result = this.addOutput(result, "tbody", "");
        result = this.addOutput(result, "tr", "");
        this.addOutput(result, "th", title);
        result = this.addOutput(result, "td", "");
        this.addOutput(result, "p", content);
    }

    addDetailTableLinkRowWrapperNewLayout (parent, title, _, url) {
        var result = this.addOutputWithAttributes(parent, "div", ["class"], ["table table--lined"]);
        result = this.addOutput(result, "table", "");
        result = this.addOutput(result, "tbody", "");
        result = this.addOutput(result, "tr", "");
        this.addOutput(result, "th", title);
        result = this.addOutput(result, "td", "");
        this.addLink(result, url, url, "_blank");
    }

    addDetailTableListWrapperNewLayout (parent: Node, title, contentList: Node[]) {
        if(contentList && contentList.length > 0) {
            var result = this.addOutputWithAttributes(parent, "div", ["class"], ["table list"]);
            result = this.addOutput(result, "table", "");
            result = this.addOutput(result, "tbody", "");
            result = this.addOutput(result, "tr", "");
            this.addOutput(result, "th", title);
            result = this.addOutput(result, "td", "");
            for (var i=0, count=contentList.length; i<count; i++) {
                var content = contentList[i];
                if (content.nodeType != 1) { //Node.ELEMENT_NODE
                    continue;
                }
                var contentName = MiscUtils.substringAfterLast(content.nodeName, ':');
                if (this.hasValue(contentName)) {
                    var contentEntry = this.addOutputWithAttributes(result, "span", ["class"], ["list_entry"]);
                    // contentEntry.appendChild(this.document.createTextNode(contentName.getTextContent()))
                    contentEntry.appendChild(this.document.createTextNode(contentName))
                }
            }
        }
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
        name = name.replace('.', '_');
        let sanitizedName = name.replace('')
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

    /**
     * Check if the given value is not equal to null, undefined of empty string
     * 
     * @param val
     * @returns {Boolean}
     */
    hasValue(val: any): boolean {
        // if (typeof val == "undefined") {
        //     return false; 
        // } else if (val == null) {
        //     return false; 
        // } else if (typeof val == "string" && val == "") {
        //     return false;
        // } else {
        //     return true;
        // }
        return !(val == null || val === "");
    }

    /**
     * Check if the given string is an url
     * @param str
     * @returns {Boolean}
     */
    isUrl(str) {
        var pattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;
        return str.match(pattern);
    }

    /**
     * Check if the given string is an email address
     * @param str
     * @returns {Boolean}
     */
    isEmail(str: string): boolean {
        var pattern = /(([a-zA-Z0-9_\-\.]+)@[a-zA-Z_\-]+?(?:\.[a-zA-Z]{2,6})+)+/gim;
        return pattern.test(str);
    }

    /**
     * Execute the given with the given parameters
     * @param f
     * @param args
     * @returns
     */
    call_f(f, args) {
        if (this.hasValue(args)) {
            if (args.length === 0)
                return f();
            else if (args.length === 1)
                return f(args[0]);
            else if (args.length === 2)
                return f(args[0], args[1]);
            else if (args.length === 3)
                return f(args[0], args[1], args[2]);
            else if (args.length === 4)
                return f(args[0], args[1], args[2], args[3]);
            else
                console.error("call does not support number of arguments: " + args.length);
                // log.error("call does not support number of arguments: " + args.length);

        } else {
            return f();
        }
    }

    /**
     * Replace the parts matching pattern with replacement in subject
     * @param pattern
     * @param replacement
     * @param subject
     * @returns
     */
    regReplace(pattern, replacement, subject) {
        // since the input type is a java string, we
        // need to convert it to a js string to use
        // the correct replace function
        var input = new String(subject);
        return input.replace(pattern, replacement);
    }
}