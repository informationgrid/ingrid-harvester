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

import * as GeoJsonUtils from '../../../utils/geojson.utils';
import 'dayjs/locale/de';
import { DateRange } from '../../../model/dateRange';
import { GeometryInformation, Keyword, Relation, Media, Person, Temporal } from '../model/index.document';
import { License } from '@shared/license.model';
import { LvrMapper } from './lvr.mapper';
import { OaiMapper } from '../../../importer/oai/mets/oai.mapper';

const dayjs = require('dayjs');
dayjs.locale('de');

export class LvrOaiMetsMapper extends LvrMapper<OaiMapper> {

    constructor(baseMapper: OaiMapper) {
        super(baseMapper);
    }

    getIdentifier(): string {
        return this.baseMapper.getId();
    }

    getTitle(): string[] {
        return this.baseMapper.getTitles();
    }

    getDescription(): string[] {
        return this.baseMapper.getDescriptions();
    }

    // TODO
    getSpatial(): GeometryInformation[] {
        return null;
    }

    getTemporal(): Temporal[] {
        return this.baseMapper.getTemporal();
    }

    getKeywords(): Keyword[] {
        return this.baseMapper.getKeywords();
    }

    getRelations(): Relation[] {
        return this.baseMapper.getRelations();
    }

    // TODO
    getMedia(): Media[] {
        let media: Media[] = [];
        media.push({
            type: '',
            url: '',
            description: ''
        });
        return media;
    }

    getPersons(): Person[] {
        return this.baseMapper.getNames();
    }

    getLicense(): License[] {
        return this.baseMapper.getLicenses();
    }

    // TODO
    getVector(): object {
        return null;
    }

    getIssued(): Date {
        let issued = null;
        return issued;
    }

    getModified(): Date {
        return this.baseMapper.getModified();
    }

    // private resolve(xmlType: any): any {
    //     if (Object.keys(xmlType).includes("_exists") && xmlType._exists == false) {
    //         return null;
    //     }
    //     return xmlType;
    // }
}
