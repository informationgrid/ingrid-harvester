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

import {XPathElementSelect} from "../../../utils/xpath.utils";
import * as xpath from "xpath";
import * as fs from 'fs';
import {DOMParser} from "@xmldom/xmldom";
import * as MiscUtils from "../../../utils/misc.utils";

export class Codelist {
    static select = <XPathElementSelect>xpath.useNamespaces({});
    protected domParser: DOMParser;

    private static instance: Codelist;

    private constructor() {
        this.domParser = MiscUtils.getDomParser();
    }

    public static getInstance() {
        if (!Codelist.instance) {
            Codelist.instance = new Codelist();
            Codelist.instance.init()
        }
        return Codelist.instance;
    }

    private lists = {}
    init () {
        this.readList("codelist_111.xml", "ident", "name");
        this.readList("codelist_502.xml");
        this.readList("codelist_505.xml");
        this.readList("codelist_510.xml");
        this.readList("codelist_518.xml");
        this.readList("codelist_523.xml");
        this.readList("codelist_527.xml");
        this.readList("codelist_2000.xml");
    }

    private readList(file: string, indexKey: string = 'iso', valueKey: string = 'id') {
        let list = {};
        let raw = this.readFile(file);
        let xml = this.domParser.parseFromString(raw, 'application/xml');
        let codelistId = Codelist.select("/de.ingrid.codelists.model.CodeList/id", xml, true)?.textContent;
        let entries = Codelist.select("/de.ingrid.codelists.model.CodeList/entries/de.ingrid.codelists.model.CodeListEntry", xml)
        for (let entry of entries) {
            let entryId = Codelist.select("./id", entry, true).textContent;
            let localisations = Codelist.select("./localisations/entry", entry).reduce((map, entry) => {
                let string =  Codelist.select("./string", entry);
                map[string[0].textContent] = string[1].textContent;
                return map;
            }, {});
            list[localisations[indexKey]] = valueKey === 'id' ? entryId : localisations[valueKey];
        }
        this.lists[codelistId] = list;
    }

    private readFile(file: string): string {
        return fs.readFileSync("app/profiles/ingrid/utils/codelists/"+file, { encoding: 'utf8', flag: 'r' });
    }

    getId(codelistId, isoValue){
        if(Object.keys(this.lists).includes(codelistId)) {
            if(Object.keys(this.lists[codelistId]).includes(isoValue)) {
                return this.lists[codelistId][isoValue]
            }
        }
        return undefined;
    }
}
