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

import { WfsMapper } from '../../../importer/wfs/wfs.mapper.js';
import type { MetadataSource } from '../../../model/index.document.js';
import * as GeojsonUtils from '../../../utils/geojson.utils.js';
import { generateWfsUuid } from '../ingrid.utils.js';
import type { IngridIndexDocument } from '../model/index.document.js';
import { ingridMapper } from './ingrid.mapper.js';

export abstract class ingridWfsMapper extends ingridMapper<WfsMapper> {

    constructor(baseMapper: WfsMapper) {
        super(baseMapper);
    }

    getX1() {
        return this.baseMapper.getBoundingBox()?.bbox?.[0];
    }

    getX2() {
        return this.baseMapper.getBoundingBox()?.bbox?.[2];
    }

    getY1() {
        return this.baseMapper.getBoundingBox()?.bbox?.[1];
    }

    getY2() {
        return this.baseMapper.getBoundingBox()?.bbox?.[3];
    }

    getAdditionalHtml(): string {
        let bbox = this.getSpatial()?.bbox;
        // let bbox = this.getBoundingBox()?.bbox;
        if (!bbox) {
            return null;
        }
        let [ x1, y1, x2, y2 ] = bbox;
        if (x1 === x2 && y1 === y2) {
            x1 -= 0.012;
            y1 -= 0.048;
            x2 += 0.012;
            y2 += 0.048;
        }
        [ x1, y1 ] = GeojsonUtils.project(x1, y1, 'WGS84', '25832');
        [ x2, y2 ] = GeojsonUtils.project(x2, y2, 'WGS84', '25832');
        var BBOX = "" + x1 + "," + y1 + "," + x2 + "," + y2;

        var addHtml = "" +
            "https://sgx.geodatenzentrum.de/wms_topplus_open?VERSION=1.3.0&amp;REQUEST=GetMap&amp;CRS=EPSG:25832&amp;BBOX=" + BBOX +
            "&amp;LAYERS=web&amp;FORMAT=image/png&amp;STYLES=&amp;WIDTH=200&amp;HEIGHT=200";

        return addHtml;
    }

    getModifiedDate(): Date{
        return this.baseMapper.getModifiedDate()
    }

    getGeneratedId(): string {
        return generateWfsUuid(this.getMetadataSource().source_base, this.baseMapper.getTypename(), this.baseMapper.gmlId);
    }

    getMetadataSource(): MetadataSource {
        return this.baseMapper.getMetadataSource();
    }

    getIssued(): Date {
        return this.baseMapper.getIssued();
    }

    executeCustomCode(doc: IngridIndexDocument) {
        this.baseMapper.executeCustomCode(doc);
    }
}
