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

import { ConnectionOptions } from 'tls';

export type GeneralSettings = {
    elasticsearch: ElasticsearchConfiguration,
    database: DatabaseConfiguration,
    cronOffset?: number,
    mappingLogLevel: 'info' | 'warn',
    proxy: string,
    allowAllUnauthorizedSSL: boolean,
    portalUrl?: string,
    urlCheck?: CronData,
    indexCheck?: CronData,
    sessionSecret: string,
    mail?: {
    	enabled?: boolean,
        mailServer?: MailServerConfiguration,
		from?: string,
    	to?: string,
        subjectTag?: string
    },
    indexBackup?: {
        active: boolean,
        indexPattern?: string,
        cronPattern?: string,
        dir?: string
    },
    harvesting: {
        maxDifference?: number
    }
};

export interface ElasticsearchConfiguration {
    url: string,
    version: string,
    user?: string,
    password?: string,
    rejectUnauthorized: boolean,
    index: string,
    alias: string,
    prefix?: string,
    numberOfShards?: number,
    numberOfReplicas?: number
}

export interface DatabaseConfiguration {
    type: 'postgresql',
    connectionString?: string,
    ssl?: boolean | ConnectionOptions | undefined,
    host?: string,
    port?: number,
    database?: string,
    user?: string,
    password?: string,
    defaultCatalogIdentifier: string
}

export interface MailServerConfiguration {
    host: string,
    port: number,
    secure?: boolean,
    auth: {
        user: string,
        pass: string
    }
}

export interface CronData {
    pattern: string;
    active: boolean;
}
