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
import type { ImporterSettings } from '../importer/importer.settings.js';
// import { DiplanungFactory } from './diplanung/profile.factory.js';
// import { ingridFactory } from './ingrid/profile.factory.js';
// import { LvrFactory } from './lvr/profile.factory.js';
import type { ProfileFactory } from './profile.factory.js';

const log = log4js.getLogger(import.meta.filename);
// TODO this is an ugly workaround and must be resolved differently, e.g. via a custom registry
// TODO also consider registry for importers and mappers
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

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
        // TODO this is a horrible workaround and needs to be changed!
        const loadFactory = (path: string) => {
            try {
                // Try .js first (Production)
                return require(`${path}.js`);
            } catch (e: any) {
                if (e.code === 'MODULE_NOT_FOUND') {
                    // Fallback to .ts (Development)
                    return require(`${path}.ts`);
                }
                throw e;
            }
        };

        switch (profile) {
            case 'ingrid':
                const { ingridFactory } = loadFactory('./ingrid/profile.factory');
                this.instance = new ingridFactory();
                break;
            case 'diplanung':
                const { DiplanungFactory } = loadFactory('./diplanung/profile.factory');
                this.instance = new DiplanungFactory();
                break;
            case 'lvr':
                const { LvrFactory } = loadFactory('./lvr/profile.factory');
                this.instance = new LvrFactory();
                break;
            default:
                let errorMsg = `Could not find profile: ${profile}`;
                log.error(errorMsg);
                throw new Error(errorMsg);
        }
        log.info(`Loaded profile: ${profile}`);
    }
}
