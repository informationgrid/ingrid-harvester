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

import * as MiscUtils from '../../../utils/misc.utils.js';
import type { GeometryInformation, Temporal } from '../../../model/index.document.js';
import type { JsonMapper } from '../../../importer/json/json.mapper.js';
import type { Keyword } from '../../../model/ingrid.index.document.js';
import type { License } from '@shared/license.model.js';
import { LvrMapper } from './lvr.mapper.js';
import type { Media, Person, Relation, Source } from '../model/index.document.js';
import { UrlUtils } from '../../../utils/url.utils.js';

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
                        source: null
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

    async getMedia(): Promise<Media[]> {
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
        return await Promise.all(this.baseMapper.record['media']?.map(async entry => {
            let mediaURL = baseURL + entry.download_url + queryParam(entry.media_type);
            let media: Media = {
                type: entry.media_type,
                url: mediaURL,
                thumbnail: baseURL + entry.url + `&width=${additionalSettings['thumbnailWidth'] ?? 480}`,
                description: entry.description
            }
            if (entry.media_type == 'image') {
                media.dimensions = await MiscUtils.getImageDimensionsFromURL(mediaURL);
            }
            return media;
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

    async getSource(): Promise<Source> {
        let requestConfig = {
            uri: `https://click-rhein.lvr.de/detail/discovery/${this.getIdentifier()}`
        };
        return {
            id: 'ClickRhein',
            display_url: await UrlUtils.urlWithProtocolFor(requestConfig, this.baseMapper.getSettings().skipUrlCheckOnHarvest, true)
        };
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
