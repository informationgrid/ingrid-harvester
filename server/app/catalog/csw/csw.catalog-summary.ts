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

import type { Logger } from 'log4js';
import { CatalogSummary } from '../../model/catalog-summary.js';

export class CswCatalogSummary extends CatalogSummary {

    protected readonly catalogType = 'CSW';

    numInserted: number = 0;
    numUpdated: number = 0;
    numDeleted: number = 0;

    protected printDetails(logger: Logger): void {
        logger.info(`  Inserted: ${this.numInserted}`);
        logger.info(`  Updated:  ${this.numUpdated}`);
        logger.info(`  Deleted:  ${this.numDeleted}`);
    }
}
