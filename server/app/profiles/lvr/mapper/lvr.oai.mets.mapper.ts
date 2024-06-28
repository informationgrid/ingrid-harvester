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
import * as ModsModel from '../../../importer/oai/mets/xmlns/www.loc.gov/mods/v3';
import 'dayjs/locale/de';
import { DateRange } from '../../../model/dateRange';
import { GeometryInformation, Keyword, Relation, Media } from '../model/index.document';
import { License } from '@shared/license.model';
import { LvrMapper } from './lvr.mapper';
import { OaiMapper } from '../../../importer/oai/mets/oai.mapper';

const dayjs = require('dayjs');
dayjs.locale('de');

export class LvrOaiMetsMapper extends LvrMapper<OaiMapper> {

    private document: ModsModel.modsDefinition;

    constructor(baseMapper: OaiMapper) {
        super(baseMapper);
        this.document = this.baseMapper.getMetsDocument();
    }

    getIdentifier(): string {
        return this.document.ID;
    }

    getTitle(): string[] {
        let titles: string[] = [];
        this.document.titleInfo.forEach(titleInfo => {
            titles.push(...titleInfo.title.map(title => title.content));
        });
        return titles;
    }

    getDescription(): string[] {
        let descriptions: string[] = [];
        this.document.abstract.filter(a => a.content).forEach(abstract => {
            descriptions.push(abstract.content);
        });
        return descriptions;
    }

    // TODO
    getSpatial(): GeometryInformation[] {
        return null;
    }

    // TODO
    getTemporal(): DateRange {
        let gte: Date, lte: Date;
        this.document.originInfo.forEach(info => {
            for (let dateProp of ['dateCreated', 'dateIssued', 'dateModified', 'dateOther', 'dateValid']) {
                info[dateProp].filter(d => d._exists).forEach(dateNode => {
                    let date = dateNode.content;
                    gte = gte == null || gte > date ? date : gte;
                    lte = lte == null || lte < date ? date : lte;
                });
            }
        });
        return { gte, lte };
    }

    getKeywords(): Keyword[] {
        let keywords: Keyword[] = [];
        this.document.subject.forEach(subject => {
            let keywordTypes = [...subject.geographic, ...subject.temporal, ...subject.topic];
            keywordTypes.filter(subType => subType._exists).forEach(subType => {
                keywords.push({
                    id: this.resolve(subType.valueURI),
                    term: this.resolve(subType.content),
                    thesaurus: this.resolve(subType.authority)
                });
            });
            // subject.geographic.filter(geographic => geographic._exists).forEach(geographic => {
            //     keywords.push({
            //         id: this.resolve(geographic.valueURI),
            //         term: this.resolve(geographic.content),
            //         thesaurus: this.resolve(geographic.authority)
            //     });
            // });
            // subject.temporal.filter(temporal => temporal._exists).forEach(temporal => {
            //     keywords.push({
            //         id: this.resolve(temporal.valueURI),
            //         term: this.resolve(temporal.content),
            //         thesaurus: this.resolve(temporal.authority)
            //     });
            // });
            // subject.topic.filter(topic => topic._exists).forEach(topic => {
            //     keywords.push({
            //         id: this.resolve(topic.valueURI),
            //         term: this.resolve(topic.content),
            //         thesaurus: this.resolve(topic.authority)
            //     });
            // });
        });
        return keywords;
    }

    getRelations(): Relation[] {
        let relations: Relation[] = this.document.relatedItem.filter(item => item._exists).map(item => ({
            id: item.href,
            type: '',
            score: null
        }));
        return relations;
    }

    // TODO
    getMedia(): Media[] {
        return null;
    }

    getLicense(): License[] {
        let licenses = this.document.accessCondition.filter(aC => aC.href && ((typeof aC.href === 'string') || aC.href['_exists'])).map(accessCondition => ({
            id: '',
            title: '',
            url: accessCondition.href
        }));
        return licenses;
    }

    // TODO
    getVector(): object {
        return null;
    }

    // TODO
    getIssued(): Date {
        let issued = null;
        // for (let info of this.baseMapper.getRecord().info) {
        //     // TODO which to use? "lido record" or "source record"
        //     if (info.type == 'lido record') {
        //         issued = info.created;
        //         break;
        //     }
        // }
        return issued;
    }

    // TODO
    getModified(): Date {
        let modified = null;
        // for (let info of this.baseMapper.getRecord().info) {
        //     // TODO which to use? "lido record" or "source record"
        //     if (info.type == 'lido record') {
        //         modified = info.modified;
        //         break;
        //     }
        // }
        return modified;
    }

    private resolve(xmlType: any): any {
        if (Object.keys(xmlType).includes("_exists") && xmlType._exists == false) {
            return null;
        }
        return xmlType;
    }
}
