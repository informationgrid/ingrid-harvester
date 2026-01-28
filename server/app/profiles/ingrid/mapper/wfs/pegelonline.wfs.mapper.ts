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

import { generateWfsUuid } from '../../ingrid.utils.js';
import { ingridWfsMapper } from '../ingrid.wfs.mapper.js';
import { PegelonlineIdfGenerator } from './pegelonline.idf.generator.js';
import type { Geometry } from 'geojson';

export class PegelonlineWfsMapper extends ingridWfsMapper {

    getCustomEntries() {
        return {
            "water": this.baseMapper.getTextContent('./gk:water'),
            "station": this.baseMapper.getTextContent('./gk:station'),
            "station_id": this.baseMapper.getTextContent('./gk:station_id'),
            "kilometer": this.baseMapper.getTextContent('./gk:kilometer'),
            "date": this.baseMapper.getTextContent('./gk:date'),
            "value": this.baseMapper.getTextContent('./gk:value'),
            "unit": this.baseMapper.getTextContent('./gk:unit'),
            "chart_url": this.baseMapper.getTextContent('./gk:chart_url'),
            "status": this.baseMapper.getTextContent('./gk:status'),
        };
    }

    getTitle(): string {
        let water = this.baseMapper.getTextContent('./gk:water');
        let station = this.baseMapper.getTextContent('./gk:station');
        let kilometer = this.baseMapper.getTextContent('./gk:kilometer');
        return `${water} ${station} (km ${kilometer})`;
    }

    getSummary(): string {
        let date = this.formatDate(new Date(this.baseMapper.getTextContent('./gk:date')));
        let value = this.baseMapper.getTextContent('./gk:value');
        let unit = this.baseMapper.getTextContent('./gk:unit');
        let summary = `${date}: ${value}${unit}`;
        return summary;
    }

    getSpatial(): Geometry | Geometry[] {
        return [
            this.baseMapper.getBoundingBox(),
        ];
    }

    getGeneratedId(): string {
        if (this.baseMapper.isFeatureType()) {
            return generateWfsUuid(this.getMetadataSource().source_base, this.baseMapper.getTypename(), '');
        }
        else {
            return this.baseMapper.getTextContent('./gk:station_ud');
        }
    }

    getIDF(): string {
        let idfGenerator = new PegelonlineIdfGenerator(this);
        return idfGenerator.createIdf();
    }

    protected formatDate(date: Date): string {
        if (!date) {
            return null;
        }
        const pad = (n: number) => n.toString().padStart(2, "0");
        return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
}
