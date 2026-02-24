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

import type { Summary } from "model/summary.js";
import { Catalog, type CatalogSettings } from '../catalog.factory.js';
import { CswCatalogSummary } from './csw.catalog-summary.js';
import type { ImporterSettings } from "importer.settings.js";
import { RequestDelegate } from "../../utils/http-request.utils.js";
import { namespaces } from "../../importer/namespaces.js";
import { getDomParser } from "../../utils/misc.utils.js";
import log4js from 'log4js';
import { XMLSerializer } from '@xmldom/xmldom';

const log = log4js.getLogger('CswCatalog');

export type CswCatalogSettings = CatalogSettings & {
    settings: {
        url: string,
        version: string,
        outputSchema: string,
    }
}

export abstract class CswCatalog extends Catalog<string> {

    readonly id: string = 'csw-catalog';
    readonly type: string = 'csw';

    protected readonly catalogSummary = new CswCatalogSummary();

    private readonly domParser = getDomParser();

    constructor(catalogSettings: CswCatalogSettings, summary: Summary) {
        super(catalogSettings, summary);
    }

    async import(transactionHandle: any, settings: ImporterSettings): Promise<void> {
        log.info(`Importing data into CSW catalog '${this.settings.id}' for source: ${transactionHandle}`);

        const records = await this.database.getDatasetsWithOriginalDocument(transactionHandle);
        if (!records || records.length === 0) {
            log.warn(`No records found for source: ${transactionHandle}`);
            return;
        }

        const cswSettings = this.settings as CswCatalogSettings;
        const targetUrl = this.buildTargetUrl(cswSettings);

        log.info(`Posting ${records.length} records to CSW-T endpoint: ${targetUrl}`);

        // Fetch existing identifiers from target to decide Insert vs Update
        const existingIds = await this.fetchExistingIdentifiers(cswSettings);
        log.info(`Found ${existingIds.size} existing records in target CSW catalog`);

        for (const record of records) {
            if (!record.original_document) {
                log.warn(`Record '${record.identifier}' has no original_document, skipping`);
                this.catalogSummary.numSkipped++;
                continue;
            }

            try {
                const enrichedXml = this.addTraceability(record.original_document, this.transactionTimestamp, settings.catalogId);
                const isUpdate = existingIds.has(record.identifier);

                const transactionXml = isUpdate
                    ? this.buildUpdateTransaction(enrichedXml, record.identifier)
                    : this.buildInsertTransaction(enrichedXml);

                const response = await this.postTransaction(targetUrl, transactionXml);
                const result = this.parseTransactionResponse(response);

                if (result.success && (result.inserted > 0 || result.updated > 0)) {
                    if (isUpdate) this.catalogSummary.numUpdated++;
                    else this.catalogSummary.numInserted++;
                } else {
                    this.catalogSummary.numErrors++;
                    log.error(`CSW-T ${isUpdate ? 'Update' : 'Insert'} failed for record '${record.identifier}': ${response}`);
                }
            } catch (e) {
                this.catalogSummary.numErrors++;
                log.error(`Error posting record '${record.identifier}' to CSW-T: ${e.message}`);
            }
        }
    }

    async deleteStaleRecords(sourceId: string): Promise<void> {
        log.info(`Post-import stale cleanup for source '${sourceId}' in CSW catalog '${this.settings.id}'`);
        const cswSettings = this.settings as CswCatalogSettings;
        const targetUrl = this.buildTargetUrl(cswSettings);

        const deleteXml = this.buildFilteredDeleteTransaction(sourceId, this.transactionTimestamp);
        const response = await this.postTransaction(targetUrl, deleteXml);
        const result = this.parseTransactionResponse(response);

        if (result.success) {
            this.catalogSummary.numDeleted = result.deleted;
        } else {
            this.catalogSummary.numErrors++;
            log.error(`Stale cleanup failed: ${response}`);
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
    private buildTargetUrl(cswSettings: CswCatalogSettings): string {
        const baseUrl = cswSettings.settings.url;
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}SERVICE=CSW&REQUEST=Transaction`;
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
    private fetchExistingIdentifiers(cswSettings: CswCatalogSettings): Promise<Set<string>> {
        const baseUrl = cswSettings.settings.url;
        return this.paginatedGetRecords(baseUrl, (start, max) => `<?xml version="1.0" encoding="UTF-8"?>
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
            || doc.getElementsByTagNameNS(namespaces.GMD, 'SV_ServiceIdentification')[0];

        if (identificationInfo) {
            identificationInfo.appendChild(keywordsFragment.documentElement);
        } else {
            log.warn('No MD_DataIdentification or SV_ServiceIdentification found in document, keywords not added');
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
        const summary = doc.getElementsByTagNameNS(namespaces.CSW, 'TransactionSummary')[0];
        if (!summary) return { success: true, inserted: 0, updated: 0, deleted: 0 };

        const inserted = parseInt(summary.getElementsByTagNameNS(namespaces.CSW, 'totalInserted')[0]?.textContent || '0', 10);
        const updated = parseInt(summary.getElementsByTagNameNS(namespaces.CSW, 'totalUpdated')[0]?.textContent || '0', 10);
        const deleted = parseInt(summary.getElementsByTagNameNS(namespaces.CSW, 'totalDeleted')[0]?.textContent || '0', 10);

        return { success: true, inserted, updated, deleted };
    }

    transform(rows: string[]): string[] {
        throw new Error('Method not implemented.');
    }

    deduplicate(datasets: string[]): string[] {
        throw new Error('Method not implemented.');
    }
}
