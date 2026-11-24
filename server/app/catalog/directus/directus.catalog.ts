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

import type { DirectusCatalogSettings } from '@shared/catalog.js';
import log4js from 'log4js';
import type { Observer } from 'rxjs';
import type { ImporterSettings } from '../../importer/importer.settings.js';
import type { ImportLogMessage } from '../../model/import.result.js';
import type { IndexDocument } from '../../model/index.document.js';
import type { Summary } from '../../model/summary.js';
import { ConfigService } from '../../services/config/ConfigService.js';
import { Catalog, type CatalogOperation } from '../catalog.factory.js';
import { DirectusClient, type DirectusImportMode, type DirectusRecord, type DirectusSession, type DirectusSessionState } from './directus.client.js';

const log = log4js.getLogger('DirectusCatalog');

export type DirectusOperation = CatalogOperation & {
    operation: 'upsert' | 'delete',
    record: DirectusRecord
};

const DEFAULT_BATCH_SIZE = 100;

const FINAL_STATES: DirectusSessionState[] = ['completed', 'failed', 'skipped'];

/**
 * Target catalog for the UmweltNAVI Ingest API ("Directus Push-Schnittstelle").
 * The pushed index documents are post-processed by the API and stored in Elasticsearch there.
 *
 * Harvested documents are always transferred in an `incremental` import session: one catalog can be fed by
 * several datasources, and a `full` session would remove the records of all datasources not part of this run.
 * The session is started with the first batch of operations and committed in `flushImport()`; afterwards the
 * session state is polled and its result is reported in the summary.
 * Reference: ingrid-editor `DirectusIndexer.kt`.
 */
export abstract class DirectusCatalog extends Catalog<IndexDocument, DirectusCatalogSettings, DirectusOperation> {

    // protected (not readonly) to allow short intervals in tests
    protected static POLL_INTERVAL_MS = 2000;
    protected static POLL_TIMEOUT_MS = 10 * 60 * 1000;

    protected readonly client: DirectusClient;
    private importId: string = null;
    private upserts: DirectusRecord[] = [];
    private deletes: DirectusRecord[] = [];

    constructor(catalogSettings: DirectusCatalogSettings, summary: Summary) {
        super(catalogSettings, summary);
        this.client = new DirectusClient(catalogSettings.url, catalogSettings.settings.catalogId, catalogSettings.settings.apiKey);
    }

    private get batchSize(): number {
        return this.settings.settings.batchSize > 0 ? this.settings.settings.batchSize : DEFAULT_BATCH_SIZE;
    }

    /**
     * Aborts the open import session if the import fails before the commit,
     * so that no partial import is left open on the server.
     */
    async import(transactionHandle: any, importerSettings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        try {
            await super.import(transactionHandle, importerSettings, observer);
        }
        catch (e) {
            await this.abortOpenImport();
            throw e;
        }
    }

    async importIntoCatalog(operations: DirectusOperation[]): Promise<void> {
        if (!operations?.length) {
            return;
        }
        for (const op of operations) {
            if (op.operation == 'upsert') {
                this.upserts.push(op.record);
                this.summary.numDocs++;
            }
            else {
                this.deletes.push(op.record);
            }
            if (this.upserts.length + this.deletes.length >= this.batchSize) {
                await this.sendOperations('incremental');
            }
        }
    }

    async flushImport(): Promise<void> {
        if (this.importId == null && !this.upserts.length && !this.deletes.length) {
            log.info(`No changes for Directus catalog '${this.settings.id}', no import session started`);
            return;
        }
        await this.sendOperations('incremental');
        await this.commitAndWait();
    }

    async deleteRecordsForDatasource(sourceId: number): Promise<void> {
        const datasource = ConfigService.getHarvesters().find(harvester => harvester.id == sourceId);
        if (!datasource?.sourceURL) {
            log.warn(`Datasource '${sourceId}' not found, no records deleted from Directus catalog '${this.settings.id}'`);
            return;
        }
        const ids = await this.database.getDocumentIdsBySourceAndCatalog(datasource.sourceURL, this.settings.id);
        if (!ids?.length) {
            log.info(`No records of datasource '${sourceId}' found for Directus catalog '${this.settings.id}'`);
            return;
        }
        try {
            await this.importIntoCatalog(ids.map(id => ({ operation: 'delete', record: { id } })));
            await this.flushImport();
            log.info(`Deleted ${ids.length} records of datasource '${sourceId}' from Directus catalog '${this.settings.id}'`);
        }
        catch (e) {
            await this.abortOpenImport();
            throw e;
        }
    }

    /**
     * An empty `full` import session removes all records of the Directus catalog.
     */
    async deleteCatalog(): Promise<void> {
        await this.ensureImportStarted('full');
        await this.commitAndWait();
        log.info(`Deleted all records of Directus catalog '${this.settings.id}'`);
    }

    getDatasetColumn(): string {
        return 'dataset';
    }

    private async ensureImportStarted(mode: DirectusImportMode): Promise<string> {
        if (this.importId == null) {
            this.importId = await this.client.startImport(mode);
            log.info(`Started ${mode} import session ${this.importId} for Directus catalog '${this.settings.id}'`);
        }
        return this.importId;
    }

    private async sendOperations(mode: DirectusImportMode): Promise<void> {
        if (!this.upserts.length && !this.deletes.length) {
            return;
        }
        const importId = await this.ensureImportStarted(mode);
        await this.client.sendOperations(importId, this.upserts, this.deletes);
        this.upserts = [];
        this.deletes = [];
    }

    private async commitAndWait(): Promise<void> {
        const importId = this.importId;
        await this.client.commit(importId);
        this.reset();
        const session = await this.waitForResult(importId);
        if (session) {
            this.reportSession(session);
        }
    }

    /**
     * Polls the import session until it reaches a final state.
     * Returns null (and reports an error) if it does not finish within the timeout.
     */
    private async waitForResult(importId: string): Promise<DirectusSession> {
        const ctor = this.constructor as typeof DirectusCatalog;
        const deadline = Date.now() + ctor.POLL_TIMEOUT_MS;
        while (true) {
            const session = await this.client.getImport(importId);
            if (FINAL_STATES.includes(session.state)) {
                return session;
            }
            if (Date.now() >= deadline) {
                this.addError(`Directus import session ${importId} not finished after ${ctor.POLL_TIMEOUT_MS / 1000}s (state: ${session.state})`);
                return null;
            }
            await new Promise(resolve => setTimeout(resolve, ctor.POLL_INTERVAL_MS));
        }
    }

    private reportSession(session: DirectusSession): void {
        const operations = session.operations;
        if (operations) {
            this.summary.increment('directusReceived', operations.received?.total ?? 0);
            this.summary.increment('directusProcessed', operations.processed ?? 0);
            this.summary.increment('directusFailed', operations.failed ?? 0);
        }
        for (const error of session.errors ?? []) {
            this.addError(`Directus record '${error.object?.id}': ${error.code} ${error.message}`);
        }
        if (session.state == 'failed') {
            this.addError(`Directus import session ${session.import_id} failed (progress: ${JSON.stringify(session.progress)})`);
        }
        else {
            log.info(`Directus import session ${session.import_id} finished with state '${session.state}'`);
        }
    }

    private addError(message: string): void {
        log.error(message);
        this.summary.errors.push({ type: 'app', error: message });
        this.summary.numErrors++;
    }

    private async abortOpenImport(): Promise<void> {
        const importId = this.importId;
        this.reset();
        if (importId != null) {
            try {
                await this.client.abort(importId);
            }
            catch (e) {
                log.error(`Could not abort Directus import session ${importId}: ${e.message}`);
            }
        }
    }

    private reset(): void {
        this.importId = null;
        this.upserts = [];
        this.deletes = [];
    }
}
