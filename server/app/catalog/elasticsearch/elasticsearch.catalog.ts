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
import log4js from 'log4js';
import type { Observer } from 'rxjs';
import type { ImporterSettings } from '../../importer/importer.settings.js';
import type { ImportLogMessage } from '../../model/import.result.js';
import type { IndexDocument } from '../../model/index.document.js';
import type { Summary } from '../../model/summary.js';
import { ElasticsearchFactory } from '../../persistence/elastic.factory.js';
import type { ElasticsearchUtils, EsOperation } from '../../persistence/elastic.utils.js';
import { ProfileFactoryLoader } from '../../profiles/profile.factory.loader.js';
import { validateDocument } from '../../persistence/elastic.validation.js';
import { Catalog } from '../catalog.factory.js';

const log = log4js.getLogger(import.meta.filename);

export abstract class ElasticsearchCatalog extends Catalog<IndexDocument, ElasticsearchCatalogSettings, EsOperation> {

    protected readonly elastic: ElasticsearchUtils;
    protected schema: object | null = null;

    constructor(catalogSettings: ElasticsearchCatalogSettings, summary: Summary) {
        super(catalogSettings, summary);
        // TODO this is a crutch until we have dedicated connections
        catalogSettings.settings.url = catalogSettings.url;
        this.elastic = ElasticsearchFactory.getElasticUtils(catalogSettings.settings, summary);
    }

    async prepareImport(transactionHandle: any, importerSettings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        // ensure that the configured index exists and has the configured alias
        const esSettings = this.settings.settings;
        if (esSettings.index && !(await this.elastic.isIndexPresent(esSettings.index))) {
            const mapping = ProfileFactoryLoader.get().getIndexMappings(esSettings.mappingFile);
            // const settings = ProfileFactoryLoader.get().getIndexSettings(esSettings.settings);
            const settings = ProfileFactoryLoader.get().getIndexSettings();
            await this.elastic.prepareIndexWithName(esSettings.index, mapping, settings);
            await this.elastic.addAlias(esSettings.index, esSettings.alias);
        }
        this.schema = ProfileFactoryLoader.get().getIndexSchema();
    }

    async importIntoCatalog(operations: EsOperation[]) {
        let validOps = operations;
        if (operations?.length && this.schema) {
            validOps = [];
            for (const op of operations) {
                if (op.document && ['index', 'create', 'update'].includes(op.operation)) {
                    const errors = validateDocument(op.document, this.schema);
                    if (errors.length) {
                        const msg = `Schema validation failed for ${op._id}: ${errors.join('; ')}`;
                        log.error(msg);
                        this.summary.errors.push({ type: 'app', error: msg });
                        continue;
                    }
                }
                validOps.push(op);
            }
        }
        // will implicitly send bulk ops when queue is full
        if (validOps?.length) {
            this.summary.numDocs += validOps.filter(op => ['index', 'create', 'update'].includes(op.operation)).length;
            await this.elastic.addOperationChunksToBulk(validOps);
        }
        // TODO revisit: marking these as skipped produces unclear feedback for the user
        // else {
        //     this.summary.skippedDocs.push('no operations produced');
        // }
    }

    async deleteRecordsForDatasource(sourceId: number): Promise<void> {
        // TODO
        throw new Error("Method not implemented.")
    }

    async deleteCatalog(): Promise<void> {
        await this.elastic.deleteIndex(this.settings.settings.index);
    }

    async flushImport(): Promise<void> {
        // send and empty current queue
        const errorsBefore = this.summary.errors.length;
        await this.elastic.sendBulkOperations();
        this.summary.numErrors += this.summary.errors.length - errorsBefore;
    }

    getDatasetColumn(): string {
        return 'dataset';
    }
}
