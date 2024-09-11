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
import { GeometryInformation, Temporal } from '../../../model/index.document';
import { Keyword, Media, Person, Relation } from '../model/index.document';
import { KldMapper } from '../../../importer/kld/kld.mapper';
import { License } from '@shared/license.model';
import { LvrMapper } from './lvr.mapper';

const dayjs = require('dayjs');
dayjs.locale('de');

export class LvrKldMapper extends LvrMapper<KldMapper> {

    constructor(baseMapper: KldMapper) {
        super(baseMapper);
    }

    getIdentifier(): string {
        return this.baseMapper.getGeneratedId();
    }

    getTitle(): string[] {
        return [this.baseMapper.getTitle()];
    }

    getDescription(): string[] {
        return [this.baseMapper.getDescription()];
    }

    getSpatial(): GeometryInformation[] {
        let spatial = this.baseMapper.getSpatial();
        let geoInfo = {
            geometry: spatial,
            centroid: GeoJsonUtils.getCentroid(spatial),
            type: null,
            description: null,
            address: this.baseMapper.getSpatialText()
        };
        return [geoInfo];
    }

    getTemporal(): Temporal[] {
        let temporals = this.baseMapper.getTemporal();
        let temporal: { gte: Date, lte: Date } = { gte: null, lte: null };
        for (let t of temporals) {
            if (t.gte && (!temporal.gte || t.gte < temporal.gte)) {
                temporal.gte = t.gte;
            }
            if (t.lte && (!temporal.lte || t.lte > temporal.lte)) {
                temporal.lte = t.lte;
            }
        }
        return [{ date_range: temporal }];
    }

    getKeywords(): Keyword[] {
        return Object.entries(this.baseMapper.getKeywords()).map(([id, keyword]) => ({
            id: id,
            term: keyword,
            thesaurus: 'WNK'
        }));
    }

    // TODO
    getGenres(): string[] {
        return null;
    }

    // TODO
    getPersons(): Person[] {
        return null;
    }

    getMedia(): Media[] {
        return this.baseMapper.getMedia();
    }

    getRelations(): Relation[] {
        return this.baseMapper.getRelations();
    }

    getLicense(): License[] {
        return [this.baseMapper.getLicense()];
    }

    // TODO
    getVector(): object {
        return null;
    }

    getIssued(): Date {
        return this.baseMapper.getIssued();
    }

    getModified(): Date {
        return this.baseMapper.getModifiedDate();
    }
}
