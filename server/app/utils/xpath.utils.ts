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

'use strict';

import * as MiscUtils from './misc.utils';

/**
 *  This is an adhoc replacement for node.firstElementChild because xmldom does not support it.
 */
export function firstElementChild(node: Node): Node & Element {
    return Object.values(node.childNodes).find(child => child.nodeType === 1) as Element;//Node.ELEMENT_NODE);
}

/**
 * Retrieve the namespace map of the given XML DOM document, based on the root element.
 * 
 * @param responseXml 
 * @returns an object with a mapping (namespace -> URI)
 */
export function getNsMap(responseXml: Document): any {
    return _extractNamespaces(firstElementChild(responseXml).attributes);
}

/**
 * Retrieve a namespace map of the given XML DOM document, based on various, sometimes not available, low-level elements.
 *
 * TODO this is very brittle and should probably be generalized if possible, while keeping
 * 
 * @param responseXml 
 * @returns an object with a mapping (namespace -> URI)
 */
export function getExtendedNsMap(responseXml: Document) {
    let nsMap = {};
    // let attrs = responseXml.getElementsByTagName('Name')[0].attributes;
    let extCaps = responseXml.getElementsByTagNameNS('*', 'ExtendedCapabilities');
    if (extCaps && extCaps.length > 0) {
        nsMap = _extractNamespaces(extCaps[0].attributes);
    }
    let featureTypeNames = responseXml.getElementsByTagNameNS('*', 'Name');
    if (featureTypeNames && featureTypeNames.length > 0) {
        nsMap = MiscUtils.merge(nsMap, _extractNamespaces(featureTypeNames[0].attributes));
    }
    return nsMap;
}

function _extractNamespaces(attributes: NamedNodeMap): object {
    let nsMap = {};
    for (let i = 0; i < attributes.length; i++) {
        let a = attributes.item(i);
        let [xmlns, ns] = a.name.split(':', 2);
        if (xmlns === 'xmlns' && ns) {
            nsMap[ns] = a.value;
        }
    }
    return nsMap;
}

export interface XPathNodeSelect {
    (expression: string, node?: Node): Array<Node>;
    (expression: string, node: Node, single: true): Node;
}

export interface XPathElementSelect {
    (expression: string, node?: Node): Array<Element>;
    (expression: string, node: Node, single: true): Element;
}
