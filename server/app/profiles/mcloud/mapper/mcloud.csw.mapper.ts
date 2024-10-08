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

import { mcloudMapper } from './mcloud.mapper';
import { CswMapper } from '../../../importer/csw/csw.mapper';

export class mcloudCswMapper extends mcloudMapper<CswMapper> {

    getDescription() {
        let description = this.baseMapper.getDescription();
        if (!description) {
            let msg = `Dataset doesn't have an abstract. It will not be displayed in the portal. Id: \'${this.getGeneratedId()}\', title: \'${this.getTitle()}\', source: \'${this.baseMapper.getSettings().sourceURL}\'`;
            this.baseMapper.log.warn(msg);
            this.baseMapper.getSummary().warnings.push(['No description', msg]);
            this.baseMapper.setValid(false);
        }

        return description;
    }

    getHierarchyLevel() {
        return this.baseMapper.getHierarchyLevel();
    }

    getOperatesOn() {
        return this.baseMapper.getOperatesOn();
    }

    getCategories(): string[] {
        let subgroups = [];
        let keywords = this.getKeywords();
        if (keywords) {
            keywords.forEach(k => {
                k = k.trim();
                if (k === 'mcloud_category_roads' || k === 'mcloud-kategorie-straßen') subgroups.push('roads');
                if (k === 'mcloud_category_climate' || k === 'mcloud-kategorie-klima-und-wetter') subgroups.push('climate');
                if (k === 'mcloud_category_waters' || k === 'mcloud-kategorie-wasserstraßen-und-gewässer') subgroups.push('waters');
                if (k === 'mcloud_category_railway' || k === 'mcloud-kategorie-bahn') subgroups.push('railway');
                if (k === 'mcloud_category_infrastructure' || k === 'mcloud-kategorie-infrastuktur') subgroups.push('infrastructure');
                if (k === 'mcloud_category_aviation' || k === 'mcloud-kategorie-luft--und-raumfahrt') subgroups.push('aviation');
            });
        }
        if (subgroups.length === 0) subgroups.push(...this.baseMapper.getSettings().defaultMcloudSubgroup);
        return subgroups;
    }
}
