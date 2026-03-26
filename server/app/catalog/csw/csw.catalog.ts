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

import type { CswCatalogSettings } from '@shared/catalog.js';
import { XMLSerializer } from '@xmldom/xmldom';
import log4js from 'log4js';
import type { Observer } from "rxjs";
import type { ImporterSettings } from "../../importer.settings.js";
import { namespaces } from "../../importer/namespaces.js";
import type { ImportLogMessage } from "../../model/import.result.js";
import type { Summary } from "../../model/summary.js";
import type { Bucket } from '../../persistence/postgres.utils.js';
import { RequestDelegate } from "../../utils/http-request.utils.js";
import { getDomParser } from "../../utils/misc.utils.js";
import { Catalog, type CatalogOperation } from '../catalog.factory.js';

const log = log4js.getLogger('CswCatalog');

export type CswDataset = {
    uuid: string,
    dataset: string
}

export type CswCatalogOperation = CatalogOperation & {
    uuid: string,
    serializedXml: string,
    isUpdate: boolean
}

export abstract class CswCatalog extends Catalog<CswDataset, CswCatalogSettings, CswCatalogOperation> {

    private readonly domParser = getDomParser();
    private existingIds: Set<string>;
    private targetUrl: string;

    constructor(catalogSettings: CswCatalogSettings, summary: Summary) {
        super(catalogSettings, summary);
    }

    async prepareImport(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        // Fetch existing identifiers from target to decide Insert vs Update
        this.existingIds = await this.fetchExistingIdentifiers();
        log.info(`Found ${this.existingIds.size} existing records in target CSW catalog`);
        this.targetUrl = this.buildTargetUrl();
    }

    async postImport(transactionHandle: any, importerSettings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        // TODO semantics are wrong, fix it
        await this.deleteStaleRecords(importerSettings.catalogId);
    }

    async processBucket(bucket: Bucket<CswDataset>): Promise<CswCatalogOperation[]> {
        const { document: record } = this.prioritizeAndFilter(bucket);
        const enrichedXml = this.addTraceability(record.dataset, this.transactionTimestamp, this.settings.id.toString());
        return [{
            uuid: record.uuid,
            serializedXml: enrichedXml,
            isUpdate: this.existingIds.has(record.uuid)
        }];
    }

    async importIntoCatalog(operations: CswCatalogOperation[]): Promise<void> {
        for (const op of operations) {
            const transactionXml = op.isUpdate
                ? this.buildUpdateTransaction(op.serializedXml, op.uuid)
                : this.buildInsertTransaction(op.serializedXml);
            const response = await this.postTransaction(this.targetUrl, transactionXml);
            const result = this.parseTransactionResponse(response);

            this.summary.numDocs += result.inserted + result.updated;

            if (result.success && (result.inserted > 0 || result.updated > 0)) {
                if (op.isUpdate) {
                    this.summary.increment('numUpdated');
                }
                else {
                    this.summary.increment('numInserted');
                }
            }
            else {
                this.summary.numErrors++;
                const msg = `CSW-T ${op.isUpdate ? 'update' : 'insert'} failed for record '${op.uuid}': ${response}`;
                this.summary.errors.push({ type: 'catalog', error: msg });
                log.error(msg);
            }
        }
    }

    async flushImport(): Promise<void> {
        log.info("CSW-T import completed");
    }

    getDatasetColumn(): string {
        return 'dataset_csw';
    }

    async deleteStaleRecords(sourceId: string): Promise<void> {
        log.info(`Post-import stale cleanup for source '${sourceId}' in CSW catalog '${this.settings.id}'`);
        const targetUrl = this.buildTargetUrl();

        const deleteXml = this.buildFilteredDeleteTransaction(sourceId, this.transactionTimestamp);
        const response = await this.postTransaction(targetUrl, deleteXml);
        const result = this.parseTransactionResponse(response);

        if (result.success) {
            this.summary.increment('numDeleted', result.deleted);
        }
        else {
            this.summary.numErrors++;
            const msg = `Stale cleanup failed: ${response}`;
            this.summary.errors.push({ type: 'catalog', error: msg });
            log.error(msg);
        }
    }

    async deleteAllRecordsForCatalog(sourceId: string): Promise<void> {
        log.info(`Deleting all records for source '${sourceId}' from CSW catalog '${this.settings.id}'`);
        // TODO: Issue a CSW-T Delete with filter subject = source:${sourceId}
        log.warn(`deleteAllRecordsForCatalog not yet implemented for source '${sourceId}'`);
    }

    /**
     * Build the full CSW-T target URL with query parameters.
     */
    private buildTargetUrl(): string {
        const separator = this.settings.url.includes('?') ? '&' : '?';
        return `${this.settings.url}${separator}SERVICE=CSW&REQUEST=Transaction`;
    }

    /**
     * Paginate through a GetRecords response and collect all dc:identifier values.
     * The caller supplies a function that builds the GetRecords XML for a given page.
     */
    private async paginatedGetRecords(
        baseUrl: string,
        buildRequestXml: (startPosition: number, maxRecords: number) => string
    ): Promise<Set<string>> {
        const identifiers = new Set<string>();
        const maxRecords = 100;
        let startPosition = 1;
        let totalRemaining = true;

        while (totalRemaining) {
            const response = await RequestDelegate.doRequest({
                uri: baseUrl,
                method: 'POST',
                headers: RequestDelegate.cswRequestHeaders(),
                body: buildRequestXml(startPosition, maxRecords),
            });

            const doc = this.domParser.parseFromString(response, 'application/xml');
            const searchResults = doc.getElementsByTagNameNS(namespaces.CSW, 'SearchResults')[0];
            if (!searchResults) {
                log.warn('No SearchResults element in GetRecords response');
                break;
            }

            const matched = parseInt(searchResults.getAttribute('numberOfRecordsMatched') || '0', 10);
            const returned = parseInt(searchResults.getAttribute('numberOfRecordsReturned') || '0', 10);

            const identifierNodes = searchResults.getElementsByTagNameNS(namespaces.DC, 'identifier');
            for (let i = 0; i < identifierNodes.length; i++) {
                const value = identifierNodes[i].textContent?.trim();
                if (value) identifiers.add(value);
            }

            startPosition += returned;
            totalRemaining = returned > 0 && startPosition <= matched;
        }

        return identifiers;
    }

    /**
     * Fetch all existing record identifiers from the target CSW catalog (unfiltered).
     * Used during import to decide Insert vs Update.
     */
    private fetchExistingIdentifiers(): Promise<Set<string>> {
        return this.paginatedGetRecords(this.settings.url, (start, max) => `<?xml version="1.0" encoding="UTF-8"?>
<csw:GetRecords xmlns:csw="${namespaces.CSW}"
                xmlns:dc="${namespaces.DC}"
                service="CSW"
                version="2.0.2"
                resultType="results"
                startPosition="${start}"
                maxRecords="${max}">
    <csw:Query typeNames="csw:Record">
        <csw:ElementSetName>brief</csw:ElementSetName>
    </csw:Query>
</csw:GetRecords>`);
    }


    /**
     * Add transaction timestamp and source ID as ISO 19139 descriptiveKeywords
     * to the MD_Metadata XML. Implements the abstract addTraceability from Catalog.
     * sourceId is ImporterSettings.catalogId — identifies which harvest source produced the record.
     */
    addTraceability(record: string, transactionTimestamp: string, sourceId: string): string {
        const originalXml = record;
        const doc = this.domParser.parseFromString(originalXml, 'application/xml');

        const keywordsBlock = `<gmd:descriptiveKeywords xmlns:gmd="${namespaces.GMD}" xmlns:gco="${namespaces.GCO}">
    <gmd:MD_Keywords>
        <gmd:keyword>
            <gco:CharacterString>transaction:${transactionTimestamp}</gco:CharacterString>
        </gmd:keyword>
        <gmd:keyword>
            <gco:CharacterString>source:${sourceId}</gco:CharacterString>
        </gmd:keyword>
        <gmd:type>
            <gmd:MD_KeywordTypeCode codeList="http://standards.iso.org/iso/19139/resources/gmxCodelists.xml#MD_KeywordTypeCode" codeListValue="other">other</gmd:MD_KeywordTypeCode>
        </gmd:type>
    </gmd:MD_Keywords>
</gmd:descriptiveKeywords>`;

        const keywordsFragment = this.domParser.parseFromString(keywordsBlock, 'application/xml');

        // Find the MD_DataIdentification or SV_ServiceIdentification element to insert keywords into
        const identificationInfo = doc.getElementsByTagNameNS(namespaces.GMD, 'MD_DataIdentification')[0]
            || doc.getElementsByTagNameNS(namespaces.SRV, 'SV_ServiceIdentification')[0];

        if (identificationInfo) {
            identificationInfo.appendChild(keywordsFragment.documentElement);
        }
        else {
            const warning = 'No MD_DataIdentification or SV_ServiceIdentification found in document, keywords not added';
            this.summary.warnings.push([warning]);
            log.warn(warning);
        }

        const serializer = new XMLSerializer();
        return serializer.serializeToString(doc);
    }

    /**
     * POST a CSW Transaction XML to the target endpoint.
     */
    private async postTransaction(targetUrl: string, transactionXml: string): Promise<string> {
        return RequestDelegate.doRequest({
            uri: targetUrl,
            method: 'POST',
            headers: RequestDelegate.cswRequestHeaders(),
            body: transactionXml,
        });
    }

    /**
     * Build a CSW-T Delete transaction that removes all records belonging to sourceId
     * that were NOT touched in the current harvest (i.e. don't carry excludeTimestamp).
     */
    private buildFilteredDeleteTransaction(sourceId: string, excludeTimestamp: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<csw:Transaction xmlns:csw="${namespaces.CSW}"
                 xmlns:ogc="${namespaces.OGC}"
                 service="CSW"
                 version="2.0.2">
    <csw:Delete typeName="gmd:MD_Metadata">
        <csw:Constraint version="1.1.0">
            <ogc:Filter>
                <ogc:And>
                    <ogc:PropertyIsLike wildCard="%" singleChar="_" escapeChar="\\">
                        <ogc:PropertyName>csw:AnyText</ogc:PropertyName>
                        <ogc:Literal>%source:${sourceId}%</ogc:Literal>
                    </ogc:PropertyIsLike>
                    <ogc:Not>
                        <ogc:PropertyIsLike wildCard="%" singleChar="_" escapeChar="\\">
                            <ogc:PropertyName>csw:AnyText</ogc:PropertyName>
                            <ogc:Literal>%transaction:${excludeTimestamp}%</ogc:Literal>
                        </ogc:PropertyIsLike>
                    </ogc:Not>
                </ogc:And>
            </ogc:Filter>
        </csw:Constraint>
    </csw:Delete>
</csw:Transaction>`;
    }

    /**
     * Build a CSW Transaction XML with an Insert operation for ISO 19139 metadata.
     */
    private buildInsertTransaction(metadataXml: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<csw:Transaction xmlns:csw="${namespaces.CSW}" xmlns:gmd="${namespaces.GMD}" xmlns:gco="${namespaces.GCO}" service="CSW" version="2.0.2">
    <csw:Insert>
        ${metadataXml}
    </csw:Insert>
</csw:Transaction>`;
    }

    /**
     * Build a CSW Transaction XML with a full-record Update operation.
     * The constraint identifies the record to replace by its identifier.
     * A constraint is required even for whole-record updates.
     */
    private buildUpdateTransaction(metadataXml: string, identifier: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<csw:Transaction xmlns:csw="${namespaces.CSW}"
                 xmlns:ogc="${namespaces.OGC}"
                 service="CSW"
                 version="2.0.2">
    <csw:Update>
        ${metadataXml}
    </csw:Update>
</csw:Transaction>`;
    }

    /**
     * Parse a CSW-T TransactionResponse and return the counts.
     */
    private parseTransactionResponse(response: string): { success: boolean, inserted: number, updated: number, deleted: number } {
        const fail = { success: false, inserted: 0, updated: 0, deleted: 0 };
        if (!response) return fail;
        if (response.includes('ExceptionReport')) return fail;
        if (!response.includes('TransactionResponse')) return fail;

        const doc = this.domParser.parseFromString(response, 'application/xml');
        const cswTransactionSummary = doc.getElementsByTagNameNS(namespaces.CSW, 'TransactionSummary')[0];
        if (!cswTransactionSummary) return { success: false, inserted: 0, updated: 0, deleted: 0 };

        const inserted = parseInt(cswTransactionSummary.getElementsByTagNameNS(namespaces.CSW, 'totalInserted')[0]?.textContent || '0', 10);
        const updated = parseInt(cswTransactionSummary.getElementsByTagNameNS(namespaces.CSW, 'totalUpdated')[0]?.textContent || '0', 10);
        const deleted = parseInt(cswTransactionSummary.getElementsByTagNameNS(namespaces.CSW, 'totalDeleted')[0]?.textContent || '0', 10);

        return { success: true, inserted, updated, deleted };
    }

    private prioritizeAndFilter(bucket: Bucket<CswDataset>): {
        document: CswDataset,
        duplicates: Map<string | number, CswDataset>
    } {
        let mainDocument: CswDataset;
        let duplicates: Map<string | number, CswDataset> = new Map<string | number, CswDataset>();

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
