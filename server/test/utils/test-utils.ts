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

import { DOMParser } from '@xmldom/xmldom';
import { expect } from 'chai';
import type { IngridIndexDocument } from '../../app/profiles/ingrid/model/index.document.js';

// shadow DOM Node because it is not available in nodejs at runtime
const Node = {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11
};

/**
 * Compares two elasticsearch documents, ignoring certain properties and handling unordered arrays.
 */
export function compareEsDocuments(actual: IngridIndexDocument, expected: IngridIndexDocument) {
    const excludedProperties = ['extras', 'idf', 'refering', 'refering_service_uuid'];
    // compare ES document without date properties, idf, and specific array properties
    expect(actual).excluding(excludedProperties).to.deep.equal(expected);
    // compare unordered arrays separately
    expect(actual.refering?.object_reference).to.deep.equalInAnyOrder(expected.refering?.object_reference);
    expect(actual.refering_service_uuid).to.deep.equalInAnyOrder(expected.refering_service_uuid);
    // compare IDF separately (necessary because of formatting discrepancies)
    expectXmlEqual(actual.idf, expected.idf);
}

/**
 * Asserts two XML strings are structurally equal using xmldom.
 */
export function expectXmlEqual(actualXml: string, expectedXml: string) {
    const parser = new DOMParser();
    const docA = parser.parseFromString(actualXml, 'text/xml');
    const docB = parser.parseFromString(expectedXml, 'text/xml');

    const isEqual = areXmlNodesEqual(docA.documentElement, docB.documentElement);
    expect(isEqual, 'XML structures are not equivalent').to.be.true;
}

/**
 * Recursively compares two DOM nodes, ignoring whitespace and sibling element order.
 */
function areXmlNodesEqual(a: Node, b: Node): boolean {
    // Text / CDATA / Comment comparison (ignore whitespace differences)
    if (a.nodeType === Node.TEXT_NODE || a.nodeType === Node.CDATA_SECTION_NODE) {
        return a.nodeValue?.trim() === b.nodeValue?.trim();
    }

    // Node type & name check
    if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) {
        return false;
    }

    // compare attributes
    if (a.nodeType === Node.ELEMENT_NODE) {
        const elemA = a as Element;
        const elemB = b as Element;

        if (elemA.attributes.length !== elemB.attributes.length) {
            return false;
        }

        for (let i = 0; i < elemA.attributes.length; i++) {
            const attr = elemA.attributes.item(i)!;
            if (elemB.getAttribute(attr.name) !== attr.value) {
                return false;
            }
        }
    }

    // extract meaningful child nodes (ignore empty/whitespace text nodes)
    const getMeaningfulChildren = (node: Node) =>
        Array.from(node.childNodes || []).filter((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
                return child.nodeValue?.trim().length! > 0;
            }
            return true; // keep elements, CDATA, etc.
        });

    // compare children (unordered matching for elements, ordered for text)
    const childrenA = getMeaningfulChildren(a);
    const childrenB = getMeaningfulChildren(b);
    if (childrenA.length !== childrenB.length) {
        return false;
    }
    const remainingB = [...childrenB];
    for (const childA of childrenA) {
        const matchIndex = remainingB.findIndex((childB) => areXmlNodesEqual(childA, childB));
        if (matchIndex === -1) {
            return false;
        }
        remainingB.splice(matchIndex, 1); // remove matched node
    }
    return true;
}

export function prepareStoredData(repeat: number, data: any): any[] {
    let storedData = [];
    for (let i = 0; i < repeat; i++) storedData.push(data);
    return storedData;
}
