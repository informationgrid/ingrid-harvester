/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import { BaseMapper } from '../importer/base.mapper';
import { DatabaseConfiguration } from '@shared/general-config.settings';
import { DeduplicateUtils } from './deduplicate.utils';
import { Entity } from '../model/entity';

export interface BulkResponse {
    queued: boolean;
    response?: any;
}

export abstract class DatabaseUtils {

    protected client;
    public static maxBulkSize: number = 50;
    public deduplicationUtils: DeduplicateUtils;
    
    public _bulkData: Entity[];

    abstract write(entity: Entity);

    abstract bulk(entity: Entity[]);

    /**
     * Add an entity to the bulk array which will be sent to the database
     * if a certain limit {{maxBulkSize}} is reached.
     * 
     * @param entity
     * @param {number} maxBulkSize
     */
    abstract addEntityToBulk(entity: Entity, maxBulkSize?: number): Promise<BulkResponse>;

    /**
     * Send all collected bulk data if any.
     */
    abstract sendBulkData(): Promise<BulkResponse>;

    // abstract ping(): Promise<boolean>;

    static ping(databaseConfiguration: Partial<DatabaseConfiguration>): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
}
