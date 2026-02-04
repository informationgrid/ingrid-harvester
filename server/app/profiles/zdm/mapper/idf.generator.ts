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

import * as MiscUtils from '../../../utils/misc.utils.js';
import * as XPathUtils from '../../../utils/xpath.utils.js';
import { WfsMapper } from '../../../importer/wfs/wfs.mapper.js';
import { ZdmMapper } from './zdm.mapper.js';

export class IdfGenerator {

    private mapper: ZdmMapper<WfsMapper>;
    private baseMapper: WfsMapper;

    private feature: Node;
    protected document: Document;

    constructor(profileMapper: ZdmMapper<WfsMapper>) {
        this.mapper = profileMapper;
        this.baseMapper = profileMapper.baseMapper;
        this.feature = XPathUtils.firstElementChild(this.baseMapper.featureOrFeatureType);
        let idfBody = '<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.portalu.de/IDF/1.0"><head/><body/></html>';
        this.document = MiscUtils.getDomParser().parseFromString(idfBody);
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

        // add the title
        this.addOutput(idfBody, "h1", this.mapper.getTitle());

        //add the summary
        this.addOutput(idfBody, "p", this.mapper.getDescription());

        //add the bounding box
        let boundingBox = this.baseMapper.getOriginalBoundingBox();
        this.addOutput(idfBody, "h2", "Ort:");
        if (boundingBox) {
            let [x1, y1] = boundingBox.lowerCorner.split(" ").map(coord => coord.trim());
            let [x2, y2] = boundingBox.upperCorner.split(" ").map(coord => coord.trim());
            let coordList = this.addOutput(idfBody, "ul");
            this.addOutput(coordList, "li", `Nord: ${y2}`);
            this.addOutput(coordList, "li", `West: ${x1}`);
            this.addOutput(coordList, "li", `Ost: ${x2}`);
            this.addOutput(coordList, "li", `S&uuml;d: ${y1}`);
        }

        // add the map preview
        let name = this.mapper.getFeatureTypeName();
        this.addOutput(idfBody, "div", this.getMapPreview(name));
        this.addOutput(idfBody, "br");

        // add details (content of all child nodes)
        this.addOutput(idfBody, "h2", "Details:");
        this.addOutput(idfBody, "h4", "Feature Attribute:");
        let detailList = this.addOutput(idfBody, "ul");
        let detailNodes = this.baseMapper.select("//*/*[local-name()='extension'][@base='gml:AbstractFeatureType']/*[local-name()='sequence']/*[local-name()='element']", this.baseMapper.featureTypeDescription);
        for (let i = 0, count = detailNodes.length; i < count; i++) {
            let content = detailNodes[i];
            if (content.nodeType != 1) { //Node.ELEMENT_NODE
                continue;
            }
            let contentName = (content as Element).getAttribute('name');
            if (this.hasValue(contentName)) {
                this.addOutputWithLinks(detailList, "li", contentName);
            }
        }
        this.addOutput(idfBody, "br");

        // // show features, if loaded
        if (this.mapper.getNumberOfFeatures() < this.baseMapper.settings.featureLimit) {
            // NOTE: the below section is filled in server/app/profiles/zdm/persistence/postgres.aggregator.ts
            this.addOutput(idfBody, "h2", "Features:");
        }

        return this.document.toString();
    }

    createFeatureIdf(idx: number): string {
        let idfBody = this.document.getElementsByTagName('body')[0];

        // add the title
        this.addOutput(idfBody, "h4", this.mapper.getGeneratedId());

        //add the summary
        this.addOutput(idfBody, "p", this.getFeatureSummary());

        //add the bounding box
        let boundingBox = this.baseMapper.getOriginalBoundingBox();
        this.addOutput(idfBody, "h6", "Ort:");
        if (boundingBox) {
            // let [ x1, y1, x2, y2 ] = boundingBox;
            let [x1, y1] = boundingBox.lowerCorner.split(" ").map(coord => coord.trim());
            let [x2, y2] = boundingBox.upperCorner.split(" ").map(coord => coord.trim());
            let coordList = this.addOutput(idfBody, "ul");
            this.addOutput(coordList, "li", `Nord: ${y2}`);
            this.addOutput(coordList, "li", `West: ${x1}`);
            this.addOutput(coordList, "li", `Ost: ${x2}`);
            this.addOutput(coordList, "li", `S&uuml;d: ${y1}`);
        }

        // add the map preview
        let name = this.mapper.getFeatureTypeName() + '_' + idx;
        this.addOutput(idfBody, "div", this.getMapPreview(name));
        this.addOutput(idfBody, "br");

        let innerHTML = "";
        for (let i = 0; i < idfBody.childNodes.length; i++) {
            innerHTML += idfBody.childNodes[i].toString() + "\n";
        }
        return innerHTML;
    }

    getFeatureSummary() {
        let { lowerCorner, upperCorner, crs } = this.baseMapper.getOriginalBoundingBox();
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

    getMapPreview(name: string) {
        let title = this.mapper.isFeatureType() ? this.mapper.getTitle() : this.mapper.getGeneratedId();
        let bbox = this.mapper.getBoundingBox()?.bbox;
        if (!bbox) {
            return "";
        }
        // Latitude first (Breitengrad = y), longitude second (Laengengrad = x)
        let [ y1, x1, y2, x2 ] = bbox.map(Number);
        let addHtml: string;

        if (this.mapper.isFeatureType()) {
            addHtml = this.mapper.getMapIFrame(450);
        }
        else {
            let mapLink = '';
            let serviceURL = encodeURIComponent(`${this.mapper.getMetadataSource().source_base}?SERVICE=WFS&VERSION=${this.baseMapper.settings.version}&`);
            mapLink += '/DE/dienste/karte?layers=WFS%7C%7C' + encodeURIComponent(title.replaceAll(',','')) + '%7C%7C' + serviceURL + '%7C%7C' + this.mapper.getFeatureTypeName();
            mapLink += '%7C%7C' + title;

            let marker = "";
            if (x1 === x2 && y1 === y2) {
                marker = 'L.marker(['+ x1 +', ' + y1 +'],' +
                    '{ icon: L.icon({ iconUrl: "/DE/dienste/ingrid-webmap-client/frontend/prd/img/marker.png" }) })';
                y1 = y1 - 0.048;
                x1 = x1 - 0.012;
                y2 = y2 + 0.048;
                x2 = x2 + 0.012;
            }
            let BBOX = "[" + x1 + "," + y1 + "],[" + x2 + "," + y2 + "]";

            let height = this.mapper.isFeatureType() ? 280 : 160;

            addHtml = '<div id="map_' + name + '" style="height: '+ height + 'px;"></div>' +
            ' <script>' + 
            'var map_' + name + ' = addLeafletMapWithId(\'map_' + name + '\', getOSMLayer(\'\'), [ ' + BBOX + ' ], null , 10);';
            if(marker !== '') {
                addHtml += marker + 
                    '.bindTooltip("'+ title + '", {direction: "center"})' +
                    '.addTo(map_' + name +' );';
            }
            else {
                addHtml += 'map_' + name + '.addLayer(L.rectangle([ ' + BBOX + ' ], {color: "#156570", weight: 1})' +
                    '.bindTooltip("'+ title + '", {direction: "center"}));';
            }
            addHtml += '</script>';
        }
        this.baseMapper.log.debug("MapPreview Html: " + addHtml);

        return addHtml;
    }

    addOutput(parent: Element, elementName: string, textContent?: string) {
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
    isUrl(str: string): boolean {
        var pattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;
        return str.match(pattern) != null;
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
}