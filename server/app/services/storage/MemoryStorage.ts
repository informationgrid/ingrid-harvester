/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  http://ec.europa.eu/idabc/eupl5
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Service} from "@tsed/common";

@Service()
export class MemoryStorage {

    private states: Map<string, string> = new Map<string, string>();

    constructor(){

    }

    /**
     * Return the value stored.
     * @param key
     */
    public get<T>(key: string):T {
        return JSON.parse(this.states.get(key));
    }
    /**
     * Serialize value and store it.
     * @param key
     * @param value
     */
    public set = (key: string, value: any) => this.states.set(key, JSON.stringify(value));
}
