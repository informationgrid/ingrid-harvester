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

import type { CatalogSettings } from '@shared/catalog.js';
import log4js from 'log4js';
import { createRequire } from 'module';
import type { Catalog, CatalogColumnType, CatalogFactory, CatalogOperation } from '../catalog/catalog.factory.js';
import type { ImporterSettings, ImporterType, ImporterTypeInfo } from '../importer.settings.js';
import { ckanCapabilities, ckanDefaults } from '../importer/ckan/ckan.settings.js';
import { cswCapabilities, cswDefaults } from '../importer/csw/csw.settings.js';
import { dcatapdeCapabilities, dcatapdeDefaults } from '../importer/dcatapde/dcatapde.settings.js';
import { dcatappluCapabilities, dcatappluDefaults } from '../importer/dcatapplu/dcatapplu.settings.js';
import { genesisCapabilities, genesisDefaults } from '../importer/genesis/genesis.settings.js';
import type { ImporterFactory } from '../importer/importer.factory.js';
import type { Importer } from '../importer/importer.js';
import { jsonCapabilities, jsonDefaults } from '../importer/json/json.settings.js';
import { kldCapabilities, kldDefaults } from '../importer/kld/kld.settings.js';
import type { Mapper } from '../importer/mapper.js';
import { oaiCapabilities, oaiDefaults } from '../importer/oai/oai.settings.js';
import { sparqlCapabilities, sparqlDefaults } from '../importer/sparql/sparql.settings.js';
import { wfsCapabilities, wfsDefaults } from '../importer/wfs/wfs.settings.js';
import type { DocumentFactory } from '../model/index.document.factory.js';
import type { IndexDocument } from '../model/index.document.js';
import type { Summary } from '../model/summary.js';
import { DatabaseFactory } from '../persistence/database.factory.js';
import type { DatabaseUtils } from '../persistence/database.utils.js';
import { ElasticsearchFactory } from '../persistence/elastic.factory.js';
import type { ElasticQueries } from '../persistence/elastic.queries.js';
import type { IndexSettings } from '../persistence/elastic.setting.js';
import type { ElasticsearchUtils } from '../persistence/elastic.utils.js';
import { PostgresQueries } from '../persistence/postgres.queries.js';
import { ConfigService } from '../services/config/ConfigService.js';

const log = log4js.getLogger(import.meta.filename);

export abstract class ProfileFactory<T extends ImporterSettings> implements ImporterFactory<T>, 
// MapperFactory<T>,
CatalogFactory {

    protected abstract getSupportedTypeNames(): ImporterType[];

    public getImporterTypes(): ImporterTypeInfo[] {
        const supportedTypes = this.getSupportedTypeNames();
        return ProfileFactory.getAvailableImporterTypes().filter(info => supportedTypes.includes(info.type));
    }

    private static getAvailableImporterTypes(): ImporterTypeInfo[] {
        return [
            { type: 'CKAN', defaults: ckanDefaults, capabilities: ckanCapabilities },
            { type: 'CSW', defaults: cswDefaults, capabilities: cswCapabilities },
            { type: 'DCATAPDE', defaults: dcatapdeDefaults, capabilities: dcatapdeCapabilities },
            { type: 'DCATAPPLU', defaults: dcatappluDefaults, capabilities: dcatappluCapabilities },
            { type: 'GENESIS', defaults: genesisDefaults, capabilities: genesisCapabilities },
            { type: 'JSON', defaults: jsonDefaults, capabilities: jsonCapabilities },
            { type: 'KLD', defaults: kldDefaults, capabilities: kldCapabilities },
            { type: 'OAI', defaults: oaiDefaults, capabilities: oaiCapabilities },
            { type: 'SPARQL', defaults: sparqlDefaults, capabilities: sparqlCapabilities },
            { type: 'WFS', defaults: wfsDefaults, capabilities: wfsCapabilities },
            { type: 'WFS.FIS', defaults: wfsDefaults, capabilities: wfsCapabilities },
            { type: 'WFS.MS', defaults: wfsDefaults, capabilities: wfsCapabilities },
            { type: 'WFS.XPLAN', defaults: wfsDefaults, capabilities: wfsCapabilities },
            { type: 'WFS.XPLAN.SYN', defaults: wfsDefaults, capabilities: wfsCapabilities },
        ];
    }

    /**
     * Set up profile specific environment.
     */
    async init(): Promise<{ database: DatabaseUtils, elastic: ElasticsearchUtils }> {
        const { database: dbConfig, elasticsearch: esConfig } = ConfigService.getGeneralSettings();
        let database = DatabaseFactory.getDatabaseUtils(dbConfig, null);
        let elastic = ElasticsearchFactory.getElasticUtils(esConfig, null);

        // try to initialize the DB tables if they do not exist
        await database.init();

        return { database, elastic };
    }

    dateReplacer(this: any, key: string, value: any): any {
        return value;
    };

    getIndexMappings(mappingName?: string): any {
        const require = createRequire(import.meta.url);
        return require(`./${this.getProfileName()}/persistence/${mappingName ?? 'default-mapping'}.json`);
    }

    getIndexSettings(settingsName?: string): IndexSettings {
        const require = createRequire(import.meta.url);
        return require(`./${this.getProfileName()}/persistence/${settingsName ?? 'default-settings'}.json`);
    }

    getPostgresQueries(): PostgresQueries {
        return PostgresQueries.getInstance();
    }

    abstract getElasticQueries(): ElasticQueries;

    abstract getImporter(settings: T): Promise<Importer<T>>;

    abstract getDocumentFactory(mapper: Mapper<ImporterSettings>): DocumentFactory<IndexDocument>;

    abstract getCatalog(catalogId: number, summary: Summary): Promise<Catalog<CatalogColumnType, CatalogSettings, CatalogOperation>>;

    abstract getProfileName(): string;
}
