/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {mcloudFactory} from "./mcloud/profile.factory";
import {DiplanungFactory} from "./diplanung/profile.factory";
import {ProfileFactory} from "./profile.factory";
import {BaseMapper} from "../importer/base.mapper";

export class ProfileFactoryLoader {
    private static instance: ProfileFactory<BaseMapper>;

    static get(): ProfileFactory<BaseMapper> {
       if(this.instance) return this.instance;

        console.log('Find Profile')
        for(let i = 0; i < process.argv.length; i++){
            let val = process.argv[i]
            if(val.toLowerCase().startsWith('--profile=')) {
                let profile = val.substring('--profile='.length).toLowerCase()

                console.log('Found Profile: '+profile);
                switch (profile) {
                    case 'mcloud':
                        this.instance = new mcloudFactory();
                        break;
                    case 'diplanung':
                        this.instance = new DiplanungFactory();
                        break;
                }
            }
        }
        return this.instance;
    }
}
