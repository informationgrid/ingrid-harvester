/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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
import { GeometryInformation, Keyword, Relation, Media } from '../model/index.document';
import { License } from '@shared/license.model';
import { LvrMapper } from './lvr.mapper';
import { OaiMapper } from '../../../importer/oai/lido/oai.mapper';

const dayjs = require('dayjs');
dayjs.locale('de');

export class LvrOaiMapper extends LvrMapper<OaiMapper> {

    constructor(baseMapper: OaiMapper) {
        super(baseMapper);
    }

    getIdentifier(): string {
        return this.baseMapper.getId();
    }

    getTitle(): string {
        return this.baseMapper.getTitles().join('; ');
    }

    getDescription(): string {
        return this.baseMapper.getDescriptions()?.[0];
    }

    getSpatial(): GeometryInformation[] {
        let geometryInformations: GeometryInformation[] = [];

        // add geometries from subjects
        geometryInformations.push(...this.baseMapper.getSubjects().map(subject => ({
            address: null,
            centroid: GeoJsonUtils.getCentroid(subject.place.geometry),
            description: subject.place.name,
            geometry: subject.place.geometry,
            type: 'subjectPlace'
        })));

        // add geometries from events
        geometryInformations.push(...this.baseMapper.getEvents().map(event => ({
            address: null,
            centroid: GeoJsonUtils.getCentroid(event.place.geometry),
            description: event.place.name,
            geometry: event.place.geometry,
            type: 'eventPlace'
        })));

        // add geometries from repositories
        geometryInformations.push(...this.baseMapper.getRepositories().map(repository => ({
            address: null,
            centroid: GeoJsonUtils.getCentroid(repository.place.geometry),
            description: repository.place.name,
            geometry: repository.place.geometry,
            type: 'repositoryPlace'
        })));

        return geometryInformations;
    }

    getTemporal(): DateRange {
        let gte, lte;
        this.baseMapper.getSubjects().forEach(subject => {
            gte = gte == null || gte > subject.period.gte ? subject.period.gte : gte;
            lte = lte == null || lte < subject.period.lte ? subject.period.lte : lte;
        });
        return { gte, lte };
    }

    getKeywords(): Keyword[] {
        return this.baseMapper.getRelations().map(relation => ({
            id: relation.id,
            term: relation.relationType.term,
            thesaurus: 'TODO'
        }));
    }

    getRelations(): Relation[] {
        return this.baseMapper.getRelations().map(relation => ({
            id: relation.id,
            type: relation.type,
            score: null
        }));
    }

    // TODO
    getMedia(): Media[] {
        return null;
    }

    getLicense(): License {
        let licenses = [];
        this.baseMapper.getResources().forEach(resource => {
            let subLicenses = resource.rights.map(right => ({
                id: resource.id,
                title: right.licenseName,
                url: right.licenseURL
            }));
            licenses.push(...subLicenses);
        });
        return licenses[0];
    }

    getVector(): object {
        return null;
    }

    getIssued(): Date {
        let issued = null;
        for (let info of this.baseMapper.getRecord().info) {
            // TODO which to use? "lido record" or "source record"
            if (info.type == 'lido record') {
                issued = info.created;
                break;
            }
        }
        return issued;
    }

    getModified(): Date {
        let modified = null;
        for (let info of this.baseMapper.getRecord().info) {
            // TODO which to use? "lido record" or "source record"
            if (info.type == 'lido record') {
                modified = info.modified;
                break;
            }
        }
        return modified;
    }
}
