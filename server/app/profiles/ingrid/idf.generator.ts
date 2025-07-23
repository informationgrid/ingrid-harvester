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

export abstract class IdfGenerator {

    protected document: Document;

    abstract createIdf(): string;

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

    addDetailHeaderWrapperNewLayoutDetailNavigation(parent, summary, detail, withinFeatureLimit: boolean, source, organisation) {
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

        if(withinFeatureLimit) {
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
                var contentName = (content as Element).getAttribute('name');
                if (this.hasValue(contentName)) {
                    var contentEntry = this.addOutputWithAttributes(result, "span", ["class"], ["list_entry"]);
                    // contentEntry.appendChild(this.document.createTextNode(contentName.getTextContent()))
                    contentEntry.appendChild(this.document.createTextNode(contentName))
                }
            }
        }
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
    regReplace(pattern: string, replacement: string, subject: string) {
        // since the input type is a java string, we
        // need to convert it to a js string to use
        // the correct replace function
        var input = new String(subject);
        return input.replace(pattern, replacement);
    }
}