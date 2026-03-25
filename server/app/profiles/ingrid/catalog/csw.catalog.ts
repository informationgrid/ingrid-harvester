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
import { CswCatalog } from "../../../catalog/csw/csw.catalog.js";
import type { ImporterSettings } from "../../../importer.settings.js";
import type { ImportLogMessage } from "../../../model/import.result.js";

const log = log4js.getLogger('IngridCswCatalog');

export class IngridCswCatalog extends CswCatalog {

    async import(transactionHandle: any, settings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        await super.import(transactionHandle, settings, observer);
    }

    async postImport(transactionHandle: any, importerSettings: ImporterSettings, observer: Observer<ImportLogMessage>): Promise<void> {
        await super.postImport(transactionHandle, importerSettings, observer);
    }
}
