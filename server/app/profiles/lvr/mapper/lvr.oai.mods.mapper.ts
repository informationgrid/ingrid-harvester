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

import 'dayjs/locale/de.js';
import { GeometryInformation, Temporal } from '../../../model/index.document.js';
import { Keyword } from '../../../model/ingrid.index.document.js';
import { License } from '@shared/license.model.js';
import { LvrMapper } from './lvr.mapper.js';
import { Media, Person, Relation, Source } from '../model/index.document.js';
import { OaiMapper } from '../../../importer/oai/mods/oai.mapper.js';
import dayjs from "dayjs";
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

    async getMedia(): Promise<Media[]> {
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

    async getSource(): Promise<Source> {
        return {
            id: 'RheinPublika',
            display_url: OaiMapper.select('./mods:identifier[@type="uri"]', this.baseMapper.record, true)?.textContent
        };
    }

    getIssued(): Date {
        let issued = null;
        return issued;
    }

    getModified(): Date {
        return this.baseMapper.getModified();
    }
}
