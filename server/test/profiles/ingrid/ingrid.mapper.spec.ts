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

// Covers specs/feature/9120-indexFormatValidation: DocumentKind resolution is mapper-driven for the
// live kinds ('ingrid'/'opendata'), catalog-config-driven only for detecting a deprecated override,
// and schema validation happens inside createIndexDocument() rather than at catalog-write time.

import * as chai from 'chai';
import sinon from 'sinon';
import { ingridFactory } from '../../../app/profiles/ingrid/profile.factory.js';
import { ingridMapper } from '../../../app/profiles/ingrid/mapper/ingrid.mapper.js';
import type { DocumentKind } from '../../../app/profiles/ingrid/mapper/ingrid.mapper.js';
import { ProfileFactoryLoader } from '../../../app/profiles/profile.factory.loader.js';
import { CatalogService } from '../../../app/services/catalog/CatalogService.js';

const expect = chai.expect;

function makeBaseMapper(catalogIds: number[] = []) {
    return {
        settings: {
            catalogIds,
            partner: 'test',
            provider: 'test',
            dataSourceName: 'test-datasource',
        },
        getGeneratedId: () => 'test-id-1',
        getTitle: () => 'Test Title',
        getModifiedDate: () => new Date('2026-01-01T00:00:00Z'),
        getMetadataSourceType: () => 'test',
        executeCustomCode: () => { /* no-op */ },
    };
}

// minimal concrete ingridMapper - ingridMapper itself has no abstract members, only concrete stubs
// (see ingrid.mapper.ts), so a bare subclass that fixes getDefaultDocumentKind() and optionally
// registers a deprecated builder is enough to exercise the base class's own resolution/validation
// logic without pulling in a real CSW/WFS/CKAN/Genesis mapper's field-extraction complexity.
class TestMapper extends ingridMapper<any> {
    constructor(baseMapper: any, private readonly defaultKind: 'ingrid' | 'opendata', private readonly registerDeprecated = true) {
        super(baseMapper);
    }

    protected getDefaultDocumentKind(): DocumentKind {
        return this.defaultKind;
    }

    protected override getDocumentBuilders() {
        const builders = super.getDocumentBuilders();
        if (!this.registerDeprecated) {
            return builders;
        }
        const deprecatedKind = `${this.defaultKind}-deprecated` as DocumentKind;
        return { ...builders, [deprecatedKind]: () => this.buildIngridDeprecatedDocument() };
    }
}

describe('ingridMapper — DocumentKind resolution and schema validation', function () {

    let sandbox: sinon.SinonSandbox;

    beforeEach(function () {
        sandbox = sinon.createSandbox();
        // use the real ingrid profile factory so getAvailableIndexMappings()/getIndexSchema() load
        // the actual index-ingrid.json/index-opendata.json schema files - the whole point of these tests
        sandbox.stub(ProfileFactoryLoader, 'get').returns(new ingridFactory() as any);
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('createIndexDocument() — live kinds', function () {

        it('builds an ingrid-shaped document, stamps $schema from index-ingrid.json, and validates cleanly', async function () {
            const mapper = new TestMapper(makeBaseMapper(), 'ingrid', false);
            const doc: any = await mapper.createIndexDocument();
            expect(doc.$schema).to.equal('https://schema.ingrid-oss.eu/index/draft/schema/index-ingrid.json');
            expect(doc.ingrid).to.not.be.undefined;
            expect(doc.dcat).to.be.undefined;
        });

        it('builds an opendata-shaped document, stamps $schema from index-opendata.json, and validates cleanly', async function () {
            const mapper = new TestMapper(makeBaseMapper(), 'opendata', false);
            const doc: any = await mapper.createIndexDocument();
            expect(doc.$schema).to.equal('https://schema.ingrid-oss.eu/index/draft/schema/index-opendata.json');
            expect(doc.ingrid).to.be.undefined;
        });

        it('throws a fatal error when the built document fails schema validation', async function () {
            class InvalidMapper extends TestMapper {
                // keywords[].source is required by both live schemas - omit it to force a validation error
                getKeywords() {
                    return [{ term: 'incomplete keyword' }] as any;
                }
            }
            const mapper = new InvalidMapper(makeBaseMapper(), 'ingrid', false);
            let caught: any;
            try {
                await mapper.createIndexDocument();
            }
            catch (e) {
                caught = e;
            }
            expect(caught).to.not.be.undefined;
            expect(caught).to.be.instanceOf(Error);
            expect(caught.message).to.include('Schema validation failed');
        });
    });

    describe('resolveMappingHint() — deprecated-only catalog hint (via getDocumentKind())', function () {

        it('uses the default live kind when no catalogIds are configured', function () {
            const mapper = new TestMapper(makeBaseMapper([]), 'ingrid');
            expect(mapper.getDocumentKind()).to.equal('ingrid');
        });

        it('never consults CatalogService when this mapper registers no deprecated builder', function () {
            const spy = sandbox.spy(CatalogService, 'getCatalogSettings');
            const mapper = new TestMapper(makeBaseMapper([1]), 'ingrid', false);
            expect(mapper.getDocumentKind()).to.equal('ingrid');
            expect(spy.called).to.be.false;
        });

        it('uses the default live kind when all target catalogs are on a non-deprecated mapping', function () {
            sandbox.stub(CatalogService, 'getCatalogSettings').returns({
                settings: { mappingFile: 'default-mapping' },
            } as any);
            const mapper = new TestMapper(makeBaseMapper([1]), 'ingrid');
            expect(mapper.getDocumentKind()).to.equal('ingrid');
        });

        it('uses the deprecated kind when all target catalogs are on this mapper\'s own deprecated mapping', function () {
            sandbox.stub(CatalogService, 'getCatalogSettings').returns({
                settings: { mappingFile: 'default-mapping.deprecated' },
            } as any);
            const mapper = new TestMapper(makeBaseMapper([1, 2]), 'ingrid');
            expect(mapper.getDocumentKind()).to.equal('ingrid-deprecated');
        });

        it('throws a fatal error when catalogIds mix this mapper\'s own deprecated mapping with a non-deprecated one', function () {
            const stub = sandbox.stub(CatalogService, 'getCatalogSettings');
            stub.withArgs(1).returns({ settings: { mappingFile: 'default-mapping.deprecated' } } as any);
            stub.withArgs(2).returns({ settings: { mappingFile: 'default-mapping' } } as any);
            const mapper = new TestMapper(makeBaseMapper([1, 2]), 'ingrid');
            expect(() => mapper.getDocumentKind()).to.throw(/mix the deprecated mapping/);
        });

        it('throws a fatal error when catalogIds mix this mapper\'s own deprecated mapping with the other family\'s deprecated mapping', function () {
            const stub = sandbox.stub(CatalogService, 'getCatalogSettings');
            stub.withArgs(1).returns({ settings: { mappingFile: 'default-mapping.deprecated' } } as any);
            stub.withArgs(2).returns({ settings: { mappingFile: 'opendata-mapping.deprecated' } } as any);
            const mapper = new TestMapper(makeBaseMapper([1, 2]), 'ingrid');
            expect(() => mapper.getDocumentKind()).to.throw();
        });
    });
});
