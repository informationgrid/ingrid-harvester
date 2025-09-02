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

import { DatabaseConfiguration } from '@shared/general-config.settings';
import { DatabaseUtils } from './database.utils.js';
import { PostgresUtils } from './postgres.utils.js';
import { Summary } from '../model/summary.js';

export class DatabaseFactory {

    public static getDatabaseUtils(configuration: DatabaseConfiguration, summary: Summary): DatabaseUtils {
        switch (configuration.type) {
            case 'postgresql':
                return new PostgresUtils(configuration, summary);
            default: 
                throw new Error('Only PostgreSQL is supported; [' + configuration.type + '] was specified');
        }
    }

    public static async ping(configuration?: DatabaseConfiguration): Promise<boolean> {
        switch (configuration?.type) {
            case 'postgresql':
                return PostgresUtils.ping(configuration);
            default: 
                throw new Error('Only PostgreSQL is supported; [' + configuration?.type + '] was specified');
        }
    }
}
