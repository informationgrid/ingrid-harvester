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

import { GeometryInformation, Temporal } from '../../../model/index.document';
import { JsonMapper } from '../../../importer/json/json.mapper';
import { Keyword, Media, Person, Relation } from '../model/index.document';
import { License } from '@shared/license.model';
import { LvrMapper } from './lvr.mapper';

export class LvrClickRheinMapper extends LvrMapper<JsonMapper> {

    constructor(baseMapper: JsonMapper) {
        super(baseMapper);
    }

    getIdentifier(): string {
        return 'CLICKRHEIN-DISCOVERY-' + this.baseMapper.id;
    }

    getTitle(): string[] {
        return [this.baseMapper.record['title']];
    }

    getDescription(): string[] {
        return [''];
    }

    getSpatial(): GeometryInformation[] {
        let location = this.baseMapper.record['location'];
        if (!location) {
            return null;
        }
        let address = location.districts?.join();
        let municipalities = location.municipalities?.join();
        if (municipalities != address) {
            address += ` (${municipalities})`;
        }
        let geoInfo = {
            geometry: { type: 'Point' as const, coordinates: location.coordinate },
            centroid: { type: 'Point' as const, coordinates: location.coordinate },
            type: null,
            description: null,
            address
        };
        return [geoInfo];
    }

    getTemporal(): Temporal[] {
        // let temporals = this.baseMapper.getTemporal();
        // let temporal: { gte: Date, lte: Date } = { gte: null, lte: null };
        // for (let t of temporals) {
        //     if (t.gte && (!temporal.gte || t.gte < temporal.gte)) {
        //         temporal.gte = t.gte;
        //     }
        //     if (t.lte && (!temporal.lte || t.lte > temporal.lte)) {
        //         temporal.lte = t.lte;
        //     }
        // }
        // return [{ date_range: temporal }];
        // let temporals = [];
        // this.baseMapper.record['epochs']?.forEach (keywordId => {
        //     let keyword = this.baseMapper.categoryMap['epochs'][keywordId];
        //     if (keyword) {
        //         temporals.push({
        //             date_range: null,
        //             date_type: 
        //         });
        //     }
        // });
        // return temporals;
        return null;
    }

    getKeywords(): Keyword[] {
        let keywords: Keyword[] = [];
        for (let category of Object.keys(this.baseMapper.record['categoryMap'])) {
            let entries = this.baseMapper.record[category];
            if (!Array.isArray(entries)) {
                continue;
            }
            for (let keywordId of entries) {
                let keyword = this.baseMapper.record['categoryMap'][category][keywordId];
                if (keyword) {
                    keywords.push({
                        id: null,
                        term: keyword,
                        thesaurus: null
                    });
                }
            }
        }
        return keywords;
    }

    getGenres(): string[] {
        return null;
    }

    getPersons(): Person[] {
        return null;
    }

    getMedia(): Media[] {
        let { sourceURL, additionalSettings } = this.baseMapper.getSettings();
        let baseURL = sourceURL.substring(0, sourceURL.indexOf('/', 8));
        const queryParam = (mediaType) => {
            switch (mediaType) {
                case 'audio': return '';
                case 'image': return `&width=${additionalSettings['imageWidth'] ?? 1920}`;
                case 'video': return '';
                default: return '';
            }
        }
        return this.baseMapper.record['media']?.map(entry => ({
            type: entry.media_type,
            url: baseURL + entry.download_url + queryParam(entry.media_type),
            thumbnail: baseURL + entry.url + `&width=${additionalSettings['thumbnailWidth'] ?? 480}`,
            description: entry.description
        }));
    }

    getRelations(): Relation[] {
        return null;
    }

    getLicense(): License[] {
        return null;
    }

    // TODO
    getVector(): object {
        return null;
    }

    getSource(): string {
        return 'ClickRhein';
    }

    // TODO
    getIssued(): Date {
        return null;
    }

    // TODO
    getModified(): Date {
        return null;
    }
}
