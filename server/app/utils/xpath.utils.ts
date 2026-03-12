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

import { namespaces } from '../importer/namespaces.js';
import * as MiscUtils from './misc.utils.js';

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
export function getNsMap(responseXml: Document, defaultPrefix: string = undefined): any {
    return _extractNamespaces(firstElementChild(responseXml).attributes, defaultPrefix);
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

function _extractNamespaces(attributes: NamedNodeMap, defaultPrefix: string = undefined): object {
    let nsMap = {};
    for (let i = 0; i < attributes.length; i++) {
        let a = attributes.item(i);
        let [xmlns, ns] = a.name.split(':', 2);
        if (xmlns === 'xmlns') {
            if (ns) {
                nsMap[ns] = a.value;
            }
            else if (defaultPrefix) {
                nsMap[defaultPrefix] = a.value;
            }
        }
    }
    return nsMap;
}

/**
 * Rename all nodes with name oldName to newName within the given node (incl. the node itself if applicable).
 * This does not alter the given node itself, instead it returns a copy.
 * 
 * @param oldName the old qualified name (with prefix)
 * @param newName the new qualified name (with prefix)
 * @param node the node in which to rename the nodes
 * @returns a copy of the given node with renamed nodes
 */
export function renameNodes(oldName: string, newName: string, node: Node): Node {
    let clone = node.cloneNode(true) as Element;
    const [sourceNsPrefix, sourceTagName] = oldName.split(":", 2);
    const sourceNsUri = namespaces[sourceNsPrefix.toUpperCase()];
    const [targetNsPrefix, targetTagName] = newName.split(":", 2);
    const targetNsUri = namespaces[targetNsPrefix.toUpperCase()];

    // get all matching descendants
    const targets: Element[] = Array.from(clone.getElementsByTagNameNS(sourceNsUri, sourceTagName));
    // if the given node matches, add it to the list
    if (clone.namespaceURI === sourceNsUri && clone.localName === sourceTagName) {
        targets.push(clone);
    }

    for (const oldNode of targets) {
        const newNode = clone.ownerDocument.createElementNS(targetNsUri, newName);
        // move attributes
        while (oldNode.attributes.length > 0) {
            const attr = oldNode.attributes[0];
            oldNode.removeAttributeNode(attr);
            newNode.setAttributeNode(attr);
        }
        // move children
        while (oldNode.firstChild) {
            newNode.appendChild(oldNode.firstChild);
        }
        // swap within DOM
        if (oldNode === clone) {
            clone = newNode;
        }
        else if (oldNode.parentNode) {
            oldNode.parentNode.replaceChild(newNode, oldNode);
        }
    }
    return clone;
}

export interface XPathNodeSelect {
    (expression: string, node?: Node): Array<Node>;
    (expression: string, node: Node, single: true): Node;
}

export interface XPathElementSelect {
    (expression: string, node?: Node): Array<Element>;
    (expression: string, node: Node, single: true): Element;
}
