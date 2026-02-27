import { CswCatalog } from "catalog/csw/csw.catalog.js";
import type { ImporterSettings } from "importer.settings.js";
import log4js from 'log4js';

const log = log4js.getLogger('IngridCswCatalog');

export class IngridCswCatalog extends CswCatalog {

    async prepareImport(transactionHandle: any, settings: ImporterSettings): Promise<void> {
        log.info(`Preparing CSW-T import for source: ${transactionHandle}`);
    }

    async import(transactionHandle: any, settings: ImporterSettings): Promise<void> {
        await super.import(transactionHandle, settings);
    }

    async postImport(transactionHandle: any, importerSettings: ImporterSettings): Promise<void> {
        await super.postImport(transactionHandle, importerSettings);
    }

}
