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

import type { ElasticsearchCatalogSettings } from '@shared/catalog.js';
import * as chai from 'chai';
import { expect } from 'chai';
import chaiExclude from 'chai-exclude';
import deepEqualInAnyOrder from 'deep-equal-in-any-order';
import fs from 'fs';
import path from 'path';
import sinon from 'sinon';
import type { Importer } from '../../app/importer/importer.js';
import type { ImporterSettings } from '../../app/importer/importer.settings.js';
import { Summary } from '../../app/model/summary.js';
import { ElasticsearchFactory } from '../../app/persistence/elastic.factory.js';
import { PostgresUtils } from '../../app/persistence/postgres.utils.js';
import { ProfileFactoryLoader } from '../../app/profiles/profile.factory.loader.js';
import { CatalogService } from '../../app/services/catalog/CatalogService.js';
import { ConfigService } from '../../app/services/config/ConfigService.js';
import type { RequestOptions } from '../../app/utils/http-request.utils.js';
import { RequestDelegate } from '../../app/utils/http-request.utils.js';
import { setupElasticMock } from '../mocks/elastic.mock.js';
import { getTestDatabaseConfig, resetDatabase, startPostgresContainer, stopPostgresContainer } from './postgres-container.js';
import { compareEsDocuments } from './test-utils.js';

chai.use(chaiExclude);
chai.use(deepEqualInAnyOrder);

export interface HttpMockRule {
    /** Match criteria for incoming requests */
    match: {
        url?: string | RegExp;
        method?: 'GET' | 'POST' | 'HEAD' | 'PUT' | 'DELETE' | string;
        query?: Record<string, string | number | boolean>;
        bodyMatch?: (body: any) => boolean;
    } | ((options: RequestOptions) => boolean);

    /** Response payload (string, object, buffer) or dynamic callback */
    response?: string | object | Buffer | ((options: RequestOptions) => any);

    /** Path to static fixture file (XML / JSON) relative to baseFixture */
    fixture?: string;
}

export interface ImporterIntegrationTestCase<T extends ImporterSettings> {
    settings: T;
    baseFixture: string,
    mocks: HttpMockRule[];
    expectedDocsDir: string;
    expectedDocCount?: number;
    profile?: string; // default: 'ingrid'
    catalogId?: number; // default: 1
}

/**
 * Resolves a fixture file or directory path relative to the project root or cwd.
 */
export function resolveFixturePath(...fixturePath: string[]): string {
    const candidates = [
        path.resolve(process.cwd(), ...fixturePath),
        path.resolve(process.cwd(), 'server', ...fixturePath),
        path.resolve(process.cwd(), '..', ...fixturePath)
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    throw new Error(`Fixture file or directory not found: ${fixturePath}. Checked paths: ${candidates.join(', ')}`);
}

/**
 * Extracts parameter value from a query string.
 */
function getQueryParam(config: RequestOptions, key: string): string | null {
    try {
        const url = new URL(RequestDelegate.getFullURL(config), 'http://localhost');
        return url.searchParams.get(key);
    }
    catch {
        return null;
    }
}

/**
 * Evaluates whether an incoming HTTP request options object matches a mock rule.
 */
function matchesRule(rule: HttpMockRule, config: RequestOptions): boolean {
    if (typeof rule.match === 'function') {
        return rule.match(config);
    }
    const { method, url, query, bodyMatch } = rule.match;
    if (method && method.toUpperCase() !== (config.method || 'GET').toUpperCase()) {
        return false;
    }
    if (url) {
        const uri = config.uri ?? '';
        if (typeof url === 'string' ? !uri.includes(url) : !url.test(uri)) {
            return false;
        }
    }
    if (query) {
        for (const [key, expected] of Object.entries(query)) {
            if (getQueryParam(config, key) !== String(expected)) {
                return false;
            }
        }
    }
    if (bodyMatch && !bodyMatch(config.body)) {
        return false;
    }
    return true;
}

/**
 * Sets up a stub for RequestDelegate.doRequest that routes requests through the provided mock rules.
 */
export function setupRequestMock(baseFixture: string, mocks: HttpMockRule[], sandbox?: sinon.SinonSandbox): sinon.SinonStub {
    const stub = sandbox ? sandbox.stub(RequestDelegate, 'doRequest') : sinon.stub(RequestDelegate, 'doRequest');
    stub.callsFake(async (config: RequestOptions) => {
        for (const rule of mocks) {
            if (matchesRule(rule, config)) {
                if (typeof rule.response === 'function') {
                    return await rule.response(config);
                }
                if (rule.response !== undefined) {
                    return rule.response;
                }
                if (rule.fixture) {
                    const filePath = resolveFixturePath(baseFixture, rule.fixture);
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (config.json || filePath.endsWith('.json')) {
                        try {
                            return JSON.parse(content);
                        }
                        catch {
                            return content;
                        }
                    }
                    return content;
                }
                return '';
            }
        }
        const errorDetails = JSON.stringify({
            uri: config.uri,
            method: config.method || 'GET',
            qs: config.qs,
            body: config.body
        }, null, 2);
        throw new Error(`This request is not mocked:\n${errorDetails}`);
    });
    return stub;
}

/**
 * Executes the importer's RxJS stream to completion.
 */
export async function runImporter<T extends ImporterSettings>(importer: Importer<T>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        importer.run().subscribe({
            next: () => {
            },
            error: (err) => reject(err),
            complete: () => resolve()
        });
    });
}

/**
 * Asserts that the Elasticsearch mock received expected bulk index operations and validates documents.
 */
export function assertElasticsearchDocuments(
    elasticMock: any,
    options: { baseFixture: string, expectedDocsDir: string, expectedDocCount?: number }
): any[] {
    expect(elasticMock.addOperationChunksToBulk.called, 'ElasticsearchUtils.addOperationChunksToBulk should be called').to.be.true;
    const allOperations = elasticMock.addOperationChunksToBulk.args.flatMap((args: any[]) => args[0]);
    const indexOps = allOperations.filter((op: any) => op.operation === 'index');
    const documents = indexOps.map((op: any) => op.document);

    if (options.expectedDocCount !== undefined) {
        expect(indexOps, 'Should contain expected number of index operations').to.have.lengthOf(options.expectedDocCount);
    }

    if (options.expectedDocsDir) {
        const dirPath = resolveFixturePath(options.baseFixture, options.expectedDocsDir);
        const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.json'));

        for (const actual of documents) {
            const expectedFilePath = path.join(dirPath, `${actual.uuid}.json`);
            if (!fs.existsSync(expectedFilePath)) {
                throw new Error(`Expected Elasticsearch fixture file not found for document UUID ${actual.uuid}: ${expectedFilePath}`);
            }
            const expected = JSON.parse(fs.readFileSync(expectedFilePath, 'utf8'));
            compareEsDocuments(actual, expected);
        }
    }

    return documents;
}

/**
 * Encapsulates PostgreSQL testcontainer startup and teardown for Mocha test suites.
 */
export function setupIntegrationTestLifecycle(profile = 'ingrid') {
    before(async function () {
        this.timeout(60000);
        process.env.IMPORTER_PROFILE = profile;

        const dbConfig = await startPostgresContainer();
        const postgresUtils = new PostgresUtils(dbConfig, new Summary('test-init', {} as any));
        await postgresUtils.init();
    });

    after(async function () {
        this.timeout(30000);
        await stopPostgresContainer();
    });
}

/**
 * High-level declarative test runner for importer integration tests.
 */
export async function runImporterIntegrationTest<T extends ImporterSettings>(
    testCase: ImporterIntegrationTestCase<T>
): Promise<void> {
    const profile = testCase.profile || 'ingrid';
    process.env.IMPORTER_PROFILE = profile;

    await resetDatabase();

    const sandbox = sinon.createSandbox();
    try {
        const dbConfig = getTestDatabaseConfig();

        sandbox.stub(ConfigService, 'getGeneralSettings').returns({
            database: dbConfig,
            elasticsearch: {prefix: 'test-', index: 'harvester'},
            harvesting: {mail: {enabled: false}, cancel: {enabled: false}},
            mail: {enabled: false}
        } as any);

        const catalogId = testCase.catalogId ?? 1;
        sandbox.stub(CatalogService, 'getCatalogSettings').withArgs(catalogId).returns({
            id: catalogId,
            name: profile,
            type: 'elasticsearch',
            url: 'http://localhost:9200',
            settings: {
                index: 'harvester'
            }
        } as ElasticsearchCatalogSettings);

        const elasticMock = setupElasticMock();
        sandbox.stub(ElasticsearchFactory, 'getElasticUtils').returns(elasticMock);

        setupRequestMock(testCase.baseFixture, testCase.mocks, sandbox);

        const importer = await ProfileFactoryLoader.get().getImporter(testCase.settings);
        await runImporter(importer);

        assertElasticsearchDocuments(elasticMock, {
            baseFixture: testCase.baseFixture,
            expectedDocsDir: testCase.expectedDocsDir,
            expectedDocCount: testCase.expectedDocCount
        });
    }
    finally {
        sandbox.restore();
    }
}
