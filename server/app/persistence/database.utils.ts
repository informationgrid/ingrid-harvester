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

import { Catalog } from '../model/dcatApPlu.model';
import { DatabaseConfiguration } from '@shared/general-config.settings';
import { ElasticsearchUtils, EsOperation } from './elastic.utils';
import { CouplingEntity, Entity, RecordEntity } from '../model/entity';
import { Summary } from '../model/summary';

export interface BulkResponse {
    queued: boolean;
    response?: any;
}

export abstract class DatabaseUtils {

    public static maxBulkSize: number = 50;
    protected configuration: DatabaseConfiguration;
    protected summary: Summary;
    
    public _bulkData: RecordEntity[];
    public _bulkCouples: CouplingEntity[];
    public defaultCatalog: Catalog;

    abstract init(): Promise<void>;

    abstract write(entity: RecordEntity);

    abstract bulk(entities: RecordEntity[], commitTransaction: boolean): Promise<BulkResponse>;

    /**
     * Add an entity to the bulk array which will be sent to the database
     * if a certain limit {{maxBulkSize}} is reached.
     * 
     * @param entity
     * @param {number} maxBulkSize
     */
    abstract addEntityToBulk(entity: Entity): Promise<BulkResponse>;

    /**
     * Send all collected bulk data if any.
     */
    abstract sendBulkData(): Promise<BulkResponse>;

    abstract sendBulkCouples(): Promise<BulkResponse>;

    abstract beginTransaction(): Promise<void>;
    
    abstract commitTransaction(): Promise<void>;

    abstract rollbackTransaction(): Promise<void>;

    // abstract pushToElastic(elastic: ElasticsearchUtils, source: string): Promise<void>;

    // abstract pushToElastic2ElectricBoogaloo(elastic: ElasticsearchUtils, source: string): Promise<void>;

    abstract pushToElastic3ReturnOfTheJedi(elastic: ElasticsearchUtils, source: string): Promise<void>;

    abstract getStoredData(ids: string[]): Promise<any[]>;

    abstract createCatalog(catalog: Catalog): Promise<Catalog>;

    abstract getCatalog(catalogIdentifier: string): Promise<Catalog>;

    static ping(configuration: Partial<DatabaseConfiguration>): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
}
