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


import {IndexDocument} from "../model/index.document";
import {mcloudFactory} from "./mcloud/profile.factory";
import {ProfileFactory} from "./profile.factory";
import {pluFactory} from "./plu/profile.factory";

export class ProfileFactoryLoader {
    private static instance: ProfileFactory;

    static get(): ProfileFactory {
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
                    case 'plu':
                        this.instance = new pluFactory();
                        break;
                }
            }
        }
        return this.instance;
    }
}
