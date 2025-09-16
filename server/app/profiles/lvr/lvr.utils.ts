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

// import { html as bbobHTML } from '@bbob/html';
// import presetHTML5 from '@bbob/preset-html5';
import { createRequire } from 'module';
import type { LvrIndexDocument } from './model/index.document.js';
import type { TagNode } from "@bbob/plugin-helper";

export function createEsId(document: LvrIndexDocument): string {
    return document.id;
}

// workaround for https://github.com/JiLiZART/BBob/issues/214
const require = createRequire(import.meta.url);
const bbobHTML = require('@bbob/html');
const presetHTML5 = require('@bbob/preset-html5').default;

/**
 * - null-values denote default handling
 * - non-listed tags are passed through
 */
const ALLOWED_BBCODE_TAGS = {
    b: (node: TagNode) => ({
        tag: 'strong',
        content: node.content,
    }),
    url: null,
    i: (node: TagNode) => ({
        tag: 'i',
        content: node.content,
    }),
    list: null,
    a: (node: TagNode) => {
        // remove "nach oben"-Links: https://redmine.wemove.com/issues/5377#note-6
        if (Object.values(node.attrs)[0] == 'TOP') {
            return null;
        }
        return {
            tag: 'a',
            attrs: {
                href: `#${Object.values(node.attrs)[0]}`
            },
            content: node.content
        }
    },
    id: (node: TagNode) => null,
    author: (node: TagNode) => node.content,
    right: (node: TagNode) => ({
        tag: 'span',
        attrs: {
            class: 'right'
        },
        content: node.content,
    }),
    td: null,
    tr: null,
    center: null,
    u: null,
    sup: null, 
    table: null,
    sub: null,
    '*': null,
    h1: null
};

const presetKuladig = presetHTML5.extend((tags) => ({
    ...tags, // keep original tag handlers from html5Preset
    ...Object.fromEntries(Object.entries(ALLOWED_BBCODE_TAGS).filter(([key, value]) => value !== null))
}));

export function convertBBCode(text: string, convertNewlines: boolean = true): string {
    text = bbobHTML(text, presetKuladig(), { onlyAllowTags: Object.keys(ALLOWED_BBCODE_TAGS) });
    if (convertNewlines) {
        text = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').replaceAll('\n', '<br>');
    }
    return text;
}
