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
import type { Observer } from "rxjs";
import type { ImporterSettings } from "../../importer.settings.js";
import type { ImportLogMessage } from "../../model/import.result.js";
import { type Summary } from "../../model/summary.js";
import { RequestDelegate } from "../../utils/http-request.utils.js";
import { Catalog, type CatalogSettings } from '../catalog.factory.js';
import { PiveauCatalogSummary } from './piveau.catalog-summary.js';

const log = log4js.getLogger('PiveauCatalog');

export type PiveauCatalogSettings = CatalogSettings & {
    settings: {
        url: string,
        version: string,
        outputSchema: string,
    }
}

export class PiveauCatalog extends Catalog<string> {

    readonly id: string = 'piveau-catalog';
    readonly type: string = 'piveau';

    protected readonly catalogSummary = new PiveauCatalogSummary();

    constructor(catalogSettings: PiveauCatalogSettings, summary: Summary) {
        super(catalogSettings, summary);
    }

    async import(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        log.info(`Importing data into Piveau catalog '${this.settings.id}' for source: ${transactionHandle}`);

        const records = await this.database.getDatasetsWithOriginalDocument(transactionHandle);
        if (!records || records.length === 0) {
            log.warn(`No records found for source: ${transactionHandle}`);
            return;
        }

        const piveauSettings = this.settings as PiveauCatalogSettings;

        log.info(`Posting ${records.length} records to Piveau endpoint: `);

        // Fetch existing identifiers from target to decide Insert vs Update
        //const existingIds = await this.fetchExistingIdentifiers(piveauSettings);
        //log.info(`Found ${existingIds.size} existing records in target Piveau catalog`);

        for (const record of records) {
            if (!record.original_document) {
                log.warn(`Record '${record.identifier}' has no original_document, skipping`);
                this.catalogSummary.numSkipped++;
                continue;
            }

            try {
                const targetUrl = this.buildTargetUrl(piveauSettings, record.id);

                const response = await this.postTransaction(targetUrl, piveauSettings, record.original_document);

                if (response.status == 201) {
                    this.catalogSummary.numInserted++;
                } else if (response.status == 204) {
                    this.catalogSummary.numUpdated++;
                } else if (response.status == 304) {
                    this.catalogSummary.numNotModified++;
                } else {
                    this.catalogSummary.numErrors++;
                    log.error(`Piveau failed for record '${record.identifier}': ${response.status} (${response.statusText})`);
                    log.trace(response)
                }
            } catch (e) {
                this.catalogSummary.numErrors++;
                log.error(`Error posting record '${record.identifier}' to Piveau: ${e.message}`);
            }
        }
    }

    async deleteStaleRecords(sourceId: string): Promise<void> {
        log.info(`Deleting stale records for source '${sourceId}' from Piveau catalog '${this.settings.id}'`);
        log.warn(`deleteStaleRecords not yet implemented for source '${sourceId}'`);
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
        const baseUrl = piveauSettings.settings.url;
        const catalog = piveauSettings.settings.catalog;
        return `${baseUrl}/catalogues/${catalog}/datasets/origin?originalId=${identifier}`;
    }

    /**
     * POST a CSW Transaction XML to the target endpoint.
     */
    private async postTransaction(targetUrl: string, settings: PiveauCatalogSettings, transactionXml: string): Promise<any> {
        return RequestDelegate.doRequest({
            uri: targetUrl,
            method: 'PUT',
            resolveWithFullResponse: true,
            headers: {"Content-Type": "application/rdf+xml", "X-API-KEY": settings.settings["api-key"]},
            body: transactionXml,
        });
    }

    transform(rows: string[]): string[] {
        throw new Error('Method not implemented.');
    }

    deduplicate(datasets: string[]): string[] {
        throw new Error('Method not implemented.');
    }

    async prepareImport(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        const piveauSettings = this.settings as PiveauCatalogSettings;
        const targetUrl = piveauSettings.settings.url + "/catalogues/" + piveauSettings.settings.catalog;
        const body = '<?xml version="1.0"?>\n' +
            '<rdf:RDF\n' +
            '    xmlns:dct="http://purl.org/dc/terms/"\n' +
            '    xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"\n' +
            '    xmlns:dcat="http://www.w3.org/ns/dcat#">\n' +
            '    <dcat:Catalog>\n' +
            `        <dct:title>${piveauSettings.settings.title}</dct:title>` +
            `        <dct:description>${piveauSettings.settings.description}</dct:description>\n` +
            '        <dct:type>dcat-ap</dct:type>\n' +
            '    </dcat:Catalog>\n' +
            '</rdf:RDF>'
        await RequestDelegate.doRequest({
            uri: targetUrl,
            method: 'PUT',
            resolveWithFullResponse: true,
            headers: {"Content-Type": "application/rdf+xml", "X-API-KEY": piveauSettings.settings["api-key"]},
            body,
        });
    }

    addTraceability(record: string, transactionTimestamp: string, sourceId: string): string {
        return "";
    }
}
