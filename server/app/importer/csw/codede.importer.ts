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

import {CswMapper} from "./csw.mapper";
import {CswImporter} from "./csw.importer";

export class CodeDeMapper extends CswMapper {

    private readonly mySettings: any;

    constructor(settings, record, harvestTime, issued, summary, generalInfo) {
        super(settings, record, harvestTime, issued, summary, generalInfo);
        this.mySettings = settings;
    }

    getMetadataSource(): any {
        let uuid = this.getUuid();
        let gmdEncoded = encodeURIComponent(CswMapper.GMD);
        let cswLink = `${this.mySettings.getRecordsUrl}?REQUEST=GetRecordById&SERVICE=CSW&VERSION=2.0.2&ElementSetName=full&outputFormat=application/xml&outputSchema=${gmdEncoded}&Id=${uuid}`;
        let portalLink = `https://code-de.org/de/record/${uuid}`;

        return {
            raw_data_source: cswLink,
            portal_link: portalLink,
            attribution: this.mySettings.defaultAttribution
        };
    }
}


export class CodedeImporter extends CswImporter {

    getMapper(settings, record, harvestTime, issuedTime, summary, generalInfo): CswMapper {
        return new CodeDeMapper(settings, record, harvestTime, issuedTime, summary, generalInfo);
    }

}
