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

import log4js from 'log4js';
import { RequestDelegate } from '../../utils/http-request.utils.js';

const log = log4js.getLogger('DirectusClient');

export type DirectusImportMode = 'incremental' | 'full';

export type DirectusSessionState = 'waiting' | 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

/**
 * A record of an upsert or delete operation. Only `id` is required by the API, all other fields are free.
 */
export type DirectusRecord = { id: string | number, [key: string]: any };

/**
 * Import session as returned by the Ingest API (`POST …/imports`, `GET …/imports/{import_id}`).
 */
export type DirectusSession = {
    catalog_id: string,
    import_id: string,
    mode: DirectusImportMode,
    state: DirectusSessionState,
    operations?: {
        received: { upsert: number, delete: number, total: number },
        processed: number,
        failed: number
    },
    progress?: {
        importing: DirectusSessionState,
        deleting: DirectusSessionState,
        indexing: DirectusSessionState
    },
    errors?: { object: { id: string | number, [key: string]: any }, code: string, message: string }[]
};

/**
 * Client for the UmweltNAVI Ingest API ("Directus Push-Schnittstelle"), OpenAPI:
 * https://directus.dev.umweltnavi.info/ingest/v1/api-docs/
 *
 * Changes are transferred inside an import session: a session is started (full or incremental),
 * operations (upsert/delete) are sent in batches and finally the session is committed.
 * In a full import all records of the catalog which were not sent are removed by the server.
 * Reference: ingrid-editor `DirectusClient.kt`.
 */
export class DirectusClient {

    private readonly baseUrl: string;
    private readonly importsUrl: string;

    constructor(url: string, catalogId: string, private readonly apiKey?: string) {
        this.baseUrl = url.replace(/\/+$/, '');
        this.importsUrl = `${this.baseUrl}/catalogs/${encodeURIComponent(catalogId)}/imports`;
    }

    async getVersion(): Promise<string> {
        const response = await this.request('GET', `${this.baseUrl}/version`, 'get version');
        return response.text();
    }

    /**
     * Starts an import session and returns its id.
     */
    async startImport(mode: DirectusImportMode): Promise<string> {
        const response = await this.request('POST', this.importsUrl, 'start import session', { mode });
        const session: DirectusSession = await response.json();
        if (!session?.import_id) {
            throw new Error(`Directus: no import_id in response: ${JSON.stringify(session)}`);
        }
        return session.import_id;
    }

    async sendOperations(importId: string, upsert: DirectusRecord[], deletes: DirectusRecord[]): Promise<void> {
        if (!upsert.length && !deletes.length) {
            return;
        }
        const payload: { upsert?: DirectusRecord[], delete?: DirectusRecord[] } = {};
        if (upsert.length) {
            payload.upsert = upsert;
        }
        if (deletes.length) {
            payload.delete = deletes;
        }
        await this.request('POST', `${this.importUrl(importId)}/operations`, 'send operations', payload);
        log.debug(`Sent ${upsert.length} upserts and ${deletes.length} deletes to import ${importId}`);
    }

    async commit(importId: string): Promise<void> {
        await this.request('POST', `${this.importUrl(importId)}/commit`, 'commit import session');
        log.debug(`Committed import ${importId}`);
    }

    async getImport(importId: string): Promise<DirectusSession> {
        const response = await this.request('GET', this.importUrl(importId), 'get import session');
        return response.json();
    }

    async abort(importId: string): Promise<void> {
        await this.request('DELETE', this.importUrl(importId), 'abort import session');
        log.info(`Aborted import ${importId}`);
    }

    private importUrl(importId: string): string {
        return `${this.importsUrl}/${encodeURIComponent(importId)}`;
    }

    private async request(method: string, uri: string, action: string, body?: object): Promise<Response> {
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        if (this.apiKey) {
            headers['x-api-key'] = this.apiKey;
        }
        if (body) {
            headers['Content-Type'] = 'application/json';
        }
        const response: Response = await RequestDelegate.doRequest({
            uri,
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            resolveWithFullResponse: true
        });
        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`Directus: could not ${action} (${response.status} ${response.statusText}): ${text}`);
        }
        return response;
    }
}
