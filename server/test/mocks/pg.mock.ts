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

import sinon from 'sinon';
import { newDb } from 'pg-mem';
import { PostgresUtils } from '../../app/persistence/postgres.utils.js';

/**
 * Mock cursor implementation that satisfies the pg-cursor interface.
 * Implements Result Chunking as requested.
 */
export class MockCursor {
    private rows: any[] = [];
    private currentIndex = 0;

    constructor(rows: any[]) {
        this.rows = rows;
    }

    /**
     * Read the next n rows from the cursor.
     */
    async read(n: number): Promise<any[]> {
        const chunk = this.rows.slice(this.currentIndex, this.currentIndex + n);
        this.currentIndex += n;
        return chunk;
    }

    close() {
        // No-op for mock
    }
}

/**
 * Sets up a mock database using pg-mem for query execution logic
 * and sinon for stubbing the pg adapter interface.
 */
export async function setupPgMock() {
    const db = newDb();

    // Register common PG functions used by the harvester
    db.public.registerFunction({
        name: 'transaction_timestamp',
        implementation: () => new Date()
    });

    /**
     * Centralized query handler that simulates PostgreSQL behavior.
     * Uses pg-mem under the hood for some operations and provides curated
     * responses for others to ensure test stability.
     */
    const handleQuery = (arg1: any, arg2?: any): any => {
        // Handle Cursor requests
        if (arg1 && arg1.constructor && arg1.constructor.name === 'Cursor') {
            return new MockCursor([{
                anchor_id: 'test-uuid-1',
                id: 1,
                identifier: 'test-uuid-1',
                uuid: 'test-uuid-1',
                dataset: { 
                    uuid: 'test-uuid-1',
                    title: 'Test Record 1', 
                    extras: { 
                        metadata: {
                            deleted: null
                        } 
                    } 
                },
                modified: new Date(),
                issued: new Date(),
                deleted: null
            }]);
        }
        
        // Handle standard SQL queries
        return (async () => {
            const q = typeof arg1 === 'string' ? arg1 : arg1.text;
            
            if (q.includes('transaction_timestamp')) {
                return { rowCount: 1, rows: [{ transaction_timestamp: new Date() }] };
            }
            if (q.includes('nonfetched') || q.includes('COUNT(*) AS total')) {
                return { rowCount: 1, rows: [{ total: 1, nonfetched: 0 }] };
            }
            if (q.includes('COUNT(*)::int AS count')) {
                return { rowCount: 1, rows: [{ count: 1 }] };
            }
            // Default empty result for other queries (e.g. bulk upserts)
            return { rowCount: 0, rows: [] };
        })();
    };
    
    // Create a mock Pool that returns our stubbed clients
    const pool: any = {
        query: sinon.stub().callsFake(handleQuery),
        connect: sinon.stub().resolves({
            query: sinon.stub().callsFake(handleQuery),
            release: () => {}
        }),
        on: sinon.stub(),
        end: sinon.stub().resolves()
    };

    // Inject the mock pool into PostgresUtils
    (PostgresUtils as any).pool = pool;

    return { db, handleQuery };
}
