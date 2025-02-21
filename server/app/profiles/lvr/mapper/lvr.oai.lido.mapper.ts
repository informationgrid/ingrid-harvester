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

import { License } from '@shared/license.model';
import 'dayjs/locale/de';
import { Link } from '../../../importer/oai/lido/lido.model';
import { OaiMapper } from '../../../importer/oai/lido/oai.mapper';
import { GeometryInformation, Temporal } from '../../../model/index.document';
import * as GeoJsonUtils from '../../../utils/geojson.utils';
import { Keyword, Media, Person, Relation } from '../model/index.document';
import { LvrMapper } from './lvr.mapper';

const dayjs = require('dayjs');
dayjs.locale('de');

export class LvrOaiLidoMapper extends LvrMapper<OaiMapper> {

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

        return geometryInformations.filter(geometryInformation => geometryInformation.geometry);
    }

    // TODO
    getTemporal(): Temporal[] {
        let temporals = this.baseMapper.getSubjects().map(subject => ({
            date_range: subject.period
            // date_type: ???
        }));
        return temporals;
    }

    getKeywords(): Keyword[] {
        let keywords: Keyword[] = [];
        this.baseMapper.getSubjects().forEach(subject => {
            keywords.push({
                id: subject.keyword.conceptIds.map(conceptId => conceptId.id),
                term: subject.keyword.terms,
                thesaurus: subject.keyword.conceptIds.map(conceptId => conceptId.source)
            });
        });
        return keywords;
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

        const findFirstURL = (links: Link[], attributes: string[]) => {
            let url = '';
            for (let i = 0; i < attributes.length && !url; i++) {
                url = links.find(link => link.format == attributes[i])?.url ?? '';
            }
            return url;
        };

        let media = [];
        for (let resource of this.baseMapper.getResources()) {
            switch (resource.type) {
                case 'digitales Bild': {
                    let fullURL = findFirstURL(resource.links, ['image_master', 'image_overview', 'image_thumbnail', 'http://terminology.lido-schema.org/resourceRepresentation_type/provided_image']);
                    let thumbnailURL = findFirstURL(resource.links, ['image_overview', 'image_thumbnail', 'image_master', 'http://terminology.lido-schema.org/resourceRepresentation_type/provided_image']);
                    media.push({
                        type: 'image',
                        url: fullURL,
                        thumbnail: thumbnailURL,
                        description: resource.description
                    });
                    break;
                }
                case 'Video': {
                    let fullURL = findFirstURL(resource.links, ['http://terminology.lido-schema.org/resourceRepresentation_type/provided_video']);
                    let thumbnailURL = findFirstURL(resource.links, ['image_overview', 'image_thumbnail', 'image_master']);
                    media.push({
                        type: 'video',
                        url: fullURL,
                        thumbnail: thumbnailURL,
                        description: resource.description
                    });
                    break;
                }
                case 'Text': {
                    let fullURL = resource.links.find(link => link.format == 'http://terminology.lido-schema.org/lido00481')?.url ?? '';
                    let thumbnailURL = findFirstURL(resource.links, ['image_overview', 'image_thumbnail']);
                    media.push({
                        type: 'document',
                        url: fullURL,
                        thumbnail: thumbnailURL,
                        description: resource.description
                    });
                    break;
                }
                default: {
                    for (let link of resource.links) {
                        media.push({
                            type: link.format,
                            url: link.url,
                            description: resource.description
                        });
                    }
                }
            }
        }
        return media;
    }

    getRelations(): Relation[] {
        return this.baseMapper.getRelations().map(relation => ({
            id: relation.id,
            type: relation.type
        }));
    }

    getLicense(): License[] {
        let licenses = [];
        this.baseMapper.getResources().forEach(resource => {
            let subLicenses = resource.rights.map(right => ({
                id: resource.id,
                title: right.licenseName,
                url: right.licenseURL
            }));
            licenses.push(...subLicenses);
        });
        return licenses;
    }

    // TODO
    getVector(): object {
        return null;
    }

    /**
     * See https://redmine.wemove.com/issues/5010
     */
    getSource(): string {
        switch (this.baseMapper.getMetadataSource().source_base) {
            case 'https://oamh-lvr.digicult-verbund.de/cv/sprache_lvr_13tHztt9gZr':
                return 'digiCULT (Sprache)';
            case 'https://oamh-lvr.digicult-verbund.de/cv/hgrojzOf7tF53kH0a0j':
                return 'digiCULT (Alltagskulturen)';
            case 'https://oamh-lvr.digicult-verbund.de/cv/hH0a0jrojzOgtF5j7u':
                let conceptIdNodes = OaiMapper.select('./lido:descriptiveMetadata/lido:objectClassificationWrap/lido:classificationWrap/lido:classification/lido:conceptID', this.baseMapper.record);
                let conceptIds = conceptIdNodes?.map(conceptIdNode => conceptIdNode.textContent) ?? [];
                let relationIds = this.getRelations()?.map(relation => relation.id) ?? [];
                if (relationIds.includes('DE-2086/lido/62b99d31aff930.75966699')
                        || conceptIds.includes('http://digicult.vocnet.org/portal/p0330')) {
                    return 'digiCULT (Preußen)';
                }
                else if (relationIds.includes('DE-2086/lido/57a2eb58249101.94114332')
                    || conceptIds.includes('http://digicult.vocnet.org/portal/p0326')) {
                    return 'digiCULT (Geschichte)';
                }
                // console.log("NO PORTAL: " + this.getIdentifier());
                // TODO filter out?
                return 'digiCULT';
            default:
                return undefined;
        }
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
