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
import { ingridFactory } from './ingrid/profile.factory.js';
import { mcloudFactory } from './mcloud/profile.factory.js';
import type { BaseMapper } from '../importer/base.mapper.js';
import { DiplanungFactory } from './diplanung/profile.factory.js';
import { LvrFactory } from './lvr/profile.factory.js';
import type { ProfileFactory } from './profile.factory.js';
import type { ImporterSettings } from 'importer.settings.js';

const log = log4js.getLogger(import.meta.filename);

export class ProfileFactoryLoader {

    private static instance: ProfileFactory<any>;

    public static get<T extends ImporterSettings>(): ProfileFactory<T> {
        if (this.instance) {
            return this.instance;
        }

        let profile = process.env.IMPORTER_PROFILE?.toLowerCase();
        if (!profile) {
            profile = process.argv.find(arg => arg.toLowerCase().startsWith('--profile=')) ?? '';
            profile = profile.toLowerCase().replace('--profile=', '');
        }
        this.createInstance(profile);
        return this.instance;
    }

    private static createInstance(profile: string) {
        switch (profile) {
            case 'ingrid':
                this.instance = new ingridFactory();
                break;
            case 'mcloud':
                this.instance = new mcloudFactory();
                break;
            case 'diplanung':
                this.instance = new DiplanungFactory();
                break;
            case 'lvr':
                this.instance = new LvrFactory();
                break;
            case 'zdm':
                this.instance = new ZdmFactory();
                break;
            default:
                let errorMsg = `Could not find profile: ${profile}`;
                log.error(errorMsg);
                throw new Error(errorMsg);
        }
        log.info(`Loaded profile: ${profile}`);
    }
}
