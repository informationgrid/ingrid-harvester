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
import { WfsMapper } from '../../../importer/wfs/wfs.mapper.js';
import type { MetadataSource } from '../../../model/index.document.js';
import * as GeojsonUtils from '../../../utils/geojson.utils.js';
import { IdfGenerator } from '../idf.generator.js';
import { generateWfsUuid } from '../ingrid.utils.js';
import type { IngridIndexDocument } from '../model/index.document.js';
import { ingridMapper } from './ingrid.mapper.js';
import type { Geometry } from 'geojson';

export class ingridWfsMapper extends ingridMapper<WfsMapper> {

    constructor(baseMapper: WfsMapper) {
        super(baseMapper);
    }

    getTitle(): string {
        const featureTitleAttribute = this.baseMapper.settings.featureTitleAttribute;
        if (featureTitleAttribute && !this.baseMapper.isFeatureType()) {
            const xpath = `.//${featureTitleAttribute}`;
            const titleNode = this.baseMapper.select(xpath, this.baseMapper.featureOrFeatureType, true);
            if (titleNode?.textContent) {
                return titleNode.textContent;
            }
        }
        return this.baseMapper.getTitle();
    }

    getSummary() {
        return "";
    }

    getSpatial(): Geometry | Geometry[] {
        return [
            this.baseMapper.getBoundingBox(),
            this.baseMapper.getSpatial()
        ];
    }

    getIDF() {
        let idfGenerator = new IdfGenerator(this);
        return idfGenerator.createIdf(this.baseMapper.fetched.idx);
    }

    getCustomEntries(toLower: boolean = true): Object {
        let localname = MiscUtils.substringAfterLast(this.baseMapper.fetched['typename'], ":", true);
        let xpath = this.baseMapper.isFeatureType() ? './*' : `./*[local-name()="${localname}"]/*`;
        xpath = "./*";
        let children = this.baseMapper.select(xpath, this.baseMapper.featureOrFeatureType);
        let obj = {};
        for (let child of children) {
            let tag = (child as Element).localName;
            if (toLower) {
                tag = tag.toLowerCase();
            }
            let text = child.textContent;
            if (obj[tag]) {
                // already exists, make array
                if (Array.isArray(obj[tag])) {
                    obj[tag].push(text);
                }
                else {
                    obj[tag] = [obj[tag], text];
                }
            }
            else {
                obj[tag] = text;
            }
        }
        obj["is_feature_type"] = this.baseMapper.isFeatureType();
        obj["typename"] = this.baseMapper.getTypename();
        return obj;
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
        // let bbox = this.getSpatial()?.bbox;
        let bbox = this.baseMapper.getBoundingBox()?.bbox;
        // let bbox = this.getBoundingBox()?.bbox;
        if (!bbox) {
            return null;
        }

        let [ x1, y1, x2, y2 ] = bbox;
        // if (x1 === x2 && y1 === y2) {
        //     x1 -= 0.012;
        //     y1 -= 0.048;
        //     x2 += 0.012;
        //     y2 += 0.048;
        // }
        [ x1, y1 ] = GeojsonUtils.project(x1, y1, 'WGS84', '25832');
        [ x2, y2 ] = GeojsonUtils.project(x2, y2, 'WGS84', '25832');

        var addHtml = `<iframe class="map-ingrid"
                src="/ingrid-webmap-client/frontend/prd/embed.html?lang=de&zoom=15&topic=favoriten&bgLayer=wmts_topplus_web&layers=bwastr_vnetz&layers_opacity=0.4&E=${x2}&N=${y1}&crosshair=marker" style="height:320px">
            </iframe>`;

        return addHtml;
    }

    getModifiedDate(): Date{
        return this.baseMapper.getModifiedDate()
    }

    getGeneratedId(): string {
        let customEntries = this.getCustomEntries();
        let existingUuid = customEntries["uuid"];
        let generatedUuid = generateWfsUuid(this.getMetadataSource().source_base, this.baseMapper.getTypename(), this.baseMapper.gmlId);
        return existingUuid ?? generatedUuid;
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
