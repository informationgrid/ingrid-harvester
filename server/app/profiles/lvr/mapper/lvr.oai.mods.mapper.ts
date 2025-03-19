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

import 'dayjs/locale/de';
import { GeometryInformation, Temporal } from '../../../model/index.document';
import { Keyword } from '../../../model/ingrid.index.document';
import { License } from '@shared/license.model';
import { LvrMapper } from './lvr.mapper';
import { Media, Person, Relation } from '../model/index.document';
import { OaiMapper } from '../../../importer/oai/mods/oai.mapper';

const dayjs = require('dayjs');
dayjs.locale('de');

export class LvrOaiModsMapper extends LvrMapper<OaiMapper> {

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

    getGenres(): string[] {
        return this.baseMapper.getGenres();
    }

    getPersons(): Person[] {
        return this.baseMapper.getNames();
    }

    getMedia(): Media[] {
        return this.baseMapper.getLocations();
    }

    getRelations(): Relation[] {
        return this.baseMapper.getRelations();
    }

    getLicense(): License[] {
        return this.baseMapper.getLicenses();
    }

    // TODO
    getVector(): object {
        return null;
    }

    getSource(): string {
        // TODO
        let portal = undefined;
        return portal;
    }

    getIssued(): Date {
        let issued = null;
        return issued;
    }

    getModified(): Date {
        return this.baseMapper.getModified();
    }
}
