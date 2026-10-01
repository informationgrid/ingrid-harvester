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

// Covers TASK-021 (specs/feature/9120-indexFormatValidation): the ingrid profile's live ES mapping is
// composed from fragments (core / ingrid / opendata) via a `composed_of` manifest.

import { expect } from 'chai';
import fs from 'fs';
import { ingridFactory } from '../../app/profiles/ingrid/profile.factory.js';
import { mergeMappings } from '../../app/utils/mapping.utils.js';

describe('mergeMappings()', function () {

    it('merges containers present in several fragments', function () {
        const merged: any = mergeMappings(
            { properties: { exports: { properties: { iso: { type: 'text' } } } } },
            { properties: { exports: { properties: { rdf: { type: 'text' } } } } }
        );
        expect(merged).to.deep.equal({
            properties: { exports: { properties: { iso: { type: 'text' }, rdf: { type: 'text' } } } }
        });
    });

    it('accepts a field defined identically in several fragments', function () {
        const field = { type: 'keyword', copy_to: ['fulltext'] };
        const merged: any = mergeMappings({ properties: { id: field } }, { properties: { id: { ...field } } });
        expect(merged.properties.id).to.deep.equal(field);
    });

    it('treats a field named "type" inside a properties container as a field, not as a field type', function () {
        const merged: any = mergeMappings(
            { properties: { references: { properties: { type: { properties: { key: { type: 'keyword' } } } } } } },
            { properties: { references: { properties: { url: { type: 'keyword' } } } } }
        );
        expect(Object.keys(merged.properties.references.properties)).to.have.members(['type', 'url']);
    });

    it('throws on a field defined differently in several fragments', function () {
        expect(() => mergeMappings(
            { properties: { temporal: { properties: { status: { type: 'keyword' } } } } },
            { properties: { temporal: { properties: { status: { type: 'text' } } } } }
        )).to.throw('Conflicting mapping definition at "properties.temporal.properties.status"');
    });

    it('throws on a scalar defined differently in several fragments', function () {
        expect(() => mergeMappings({ dynamic: true }, { dynamic: false })).to.throw('Conflicting mapping definition at "dynamic"');
    });

    it('does not modify its inputs', function () {
        const a = { properties: { exports: { properties: { iso: { type: 'text' } } } } };
        const b = { properties: { exports: { properties: { rdf: { type: 'text' } } } } };
        const before = structuredClone([a, b]);
        mergeMappings(a, b);
        expect([a, b]).to.deep.equal(before);
    });
});

describe('ProfileFactory.getIndexMappings() — composed ingrid default mapping', function () {

    it('merges the core, ingrid and opendata fragments', function () {
        const mapping = new ingridFactory().getIndexMappings('default-mapping');
        expect(mapping.composed_of).to.be.undefined;
        expect(mapping.dynamic).to.equal(true);
        // core
        expect(mapping.properties).to.include.keys('id', 'metadata', 'title', 'spatials', 'fulltext');
        // ingrid / opendata
        expect(mapping.properties).to.include.keys('ingrid', 'dcat', 'distributions');
        // containers shared between fragments
        expect(mapping.properties.exports.properties).to.have.keys('iso', 'rdf');
        expect(mapping.properties.temporal.properties).to.include.keys('data_temporal', 'status');
    });

    it('returns a mapping file without composed_of unchanged', function () {
        const file = JSON.parse(fs.readFileSync(new URL('../../app/profiles/ingrid/persistence/ingrid-meta-mapping.json', import.meta.url), 'utf8'));
        expect(file.composed_of).to.be.undefined;
        expect(new ingridFactory().getIndexMappings('ingrid-meta-mapping')).to.deep.equal(file);
    });
});
