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

import type { PiveauCatalogSettings } from '@shared/catalog.js';
import log4js from 'log4js';
import type { Observer } from "rxjs";
import type { ImporterSettings } from "../../importer.settings.js";
import type { ImportLogMessage } from "../../model/import.result.js";
import { type Summary } from "../../model/summary.js";
import type { Bucket } from '../../persistence/postgres.utils.js';
import { RequestDelegate } from "../../utils/http-request.utils.js";
import { Catalog, type CatalogOperation } from '../catalog.factory.js';
import { PiveauCatalogSummary } from './piveau.catalog-summary.js';

const log = log4js.getLogger('PiveauCatalog');

export type PiveauDataset = {
    uuid: string,
    dataset: string
}

export type PiveauCatalogOperation = CatalogOperation & {
    uuid: string,
    serializedXml: string,
}

export class PiveauCatalog extends Catalog<PiveauDataset, PiveauCatalogSettings, PiveauCatalogOperation> {

    protected readonly catalogSummary = new PiveauCatalogSummary();

    constructor(catalogSettings: PiveauCatalogSettings, summary: Summary) {
        super(catalogSettings, summary);
    }

    async prepareImport(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        const targetUrl = this.settings.url + "/catalogues/" + this.settings.settings.catalog;
        const body = '<?xml version="1.0"?>\n' +
            '<rdf:RDF\n' +
            '    xmlns:dct="http://purl.org/dc/terms/"\n' +
            '    xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"\n' +
            '    xmlns:dcat="http://www.w3.org/ns/dcat#">\n' +
            '    <dcat:Catalog>\n' +
            `        <dct:title>${this.settings.settings.title}</dct:title>` +
            `        <dct:description>${this.settings.settings.description}</dct:description>\n` +
            '        <dct:type>dcat-ap</dct:type>\n' +
            '    </dcat:Catalog>\n' +
            '</rdf:RDF>';
        // TODO check response for error
        await RequestDelegate.doRequest({
            uri: targetUrl,
            method: 'PUT',
            resolveWithFullResponse: true,
            headers: {"Content-Type": "application/rdf+xml", "X-API-KEY": this.settings.settings.apiKey},
            body,
        });
    }

    async postImport(transactionHandle: any, importerSettings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        // TODO semantics are wrong, fix it
        await this.deleteStaleRecords(importerSettings.catalogId);
    }

    async processBucket(bucket: Bucket<PiveauDataset>): Promise<PiveauCatalogOperation[]> {
        const { document } = this.prioritizeAndFilter(bucket);
        return [{
            uuid: document.uuid,
            serializedXml: document.dataset
        }];
    }

    async importIntoCatalog(operations: PiveauCatalogOperation[]): Promise<void> {
        for (const op of operations) {
            try {
                const targetUrl = this.buildTargetUrl(this.settings, op.uuid);
                const response = await this.postTransaction(targetUrl, this.settings, op.serializedXml);
                switch (response.status) {
                    case 201:
                        this.catalogSummary.numInserted++;
                        break;
                    case 204:
                        this.catalogSummary.numUpdated++;
                        break;
                    case 304:
                        this.catalogSummary.numNotModified++;
                        break;
                    default:
                        this.catalogSummary.numErrors++;
                        log.error(`Piveau failed for record '${op.uuid}': ${response.status} (${response.statusText})`);
                        log.trace(response)
                }
            }
            catch (e) {
                this.catalogSummary.numErrors++;
                log.error(`Error posting record '${op.uuid}' to Piveau: ${e.message}`);
            }
        }
    }

    async flushImport(): Promise<void> {
        log.info("Piveau import completed");
    }

    getDatasetColumn(): string {
        return 'dataset_dcatapde';
    }

    async deleteStaleRecords(sourceId: string): Promise<void> {
        log.info(`Deleting stale records for source '${sourceId}' from Piveau catalog '${this.settings.id}'`);

        const expectingIdentifier = await this.database.getIdentifiersByCatalog(this.settings.id);
        const existingIdentifier = await this.getIdentifierByPiveauCatalog();
        const identifierToDelete = existingIdentifier.filter(identifier => !expectingIdentifier.includes(identifier))
        log.info(`Datasets to delete: ${identifierToDelete.length}`);
        for(const identifier of identifierToDelete) {
            log.info(`Delete dataset ${identifier}`);
            await this.deleteDataset(identifier)
        }
    }

    async deleteAllRecordsForCatalog(sourceId: string): Promise<void> {
        log.info(`Deleting all records for source '${sourceId}' from Piveau catalog '${this.settings.id}'`);
        // TODO: Issue a Piveau Delete with filter subject = source:${sourceId}
        log.warn(`deleteAllRecordsForCatalog not yet implemented for source '${sourceId}'`);
    }

    /**
     * Build the full Piveau target URL with query parameters.
     */
    private buildTargetUrl(piveauSettings: PiveauCatalogSettings, identifier: string): string {
        const baseUrl = piveauSettings.url;
        const catalog = piveauSettings.settings.catalog;
        return `${baseUrl}/catalogues/${catalog}/datasets/origin?originalId=${identifier}`;
    }

    /**
     * POST a DCAT Dataset to the target endpoint.
     */
    private async postTransaction(targetUrl: string, settings: PiveauCatalogSettings, transactionXml: string): Promise<any> {
        return RequestDelegate.doRequest({
            uri: targetUrl,
            method: 'PUT',
            resolveWithFullResponse: true,
            headers: {"Content-Type": "application/rdf+xml", "X-API-KEY": settings.settings.apiKey},
            body: transactionXml,
        });
    }

    transform(rows: string[]): string[] {
        throw new Error('Method not implemented.');
    }

    deduplicate(datasets: string[]): string[] {
        throw new Error('Method not implemented.');
    }

    async getIdentifierByPiveauCatalog(): Promise<string[]> {
        const targetUrl = this.settings.url + "/catalogues/" + this.settings.settings.catalog + "/datasets?valueType=originalIds&limit=100";
        let result = [];
        let offset = 0;
        let count = 0;
        do {
            const response = await RequestDelegate.doRequest({
                uri: targetUrl + "&offset=" + offset,
                method: 'GET',
                resolveWithFullResponse: true,
                headers: {"X-API-KEY": this.settings.settings.apiKey},
                json: true,
            });
            const data = await response.json();
            count = data.length;
            offset += count;
            result = result.concat(data);
        } while (false) // Limit und Offset werden ignoriert.
        return result;
    }

    async deleteDataset(originalId: string): Promise<void> {
        const targetUrl = this.settings.url + "/catalogues/" + this.settings.settings.catalog + "/datasets/origin?originalId=" + originalId;
        // TODO check response for error
        await RequestDelegate.doRequest({
            uri: targetUrl,
            method: 'DELETE',
            resolveWithFullResponse: true,
            headers: {"X-API-KEY": this.settings.settings.apiKey},
        });
    }

    private prioritizeAndFilter(bucket: Bucket<PiveauDataset>): {
        document: PiveauDataset,
        duplicates: Map<string | number, PiveauDataset>
    } {
        let mainDocument: PiveauDataset;
        let duplicates: Map<string | number, PiveauDataset> = new Map<string | number, PiveauDataset>();

        for (let [id, document] of bucket.duplicates) {
            if (mainDocument == null) {
                mainDocument = document;
            }
            else {
                duplicates.set(id, document);
            }
        }

        return { document: mainDocument, duplicates };
    }
}
