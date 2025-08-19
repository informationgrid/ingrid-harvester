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

import * as GeojsonUtils from '../../../utils/geojson.utils';
import { IdfGenerator } from './idf.generator';
import { MetadataSource } from '../../../model/index.document';
import { WfsMapper } from '../../../importer/wfs/wfs.mapper';
import { ZdmIndexDocument } from '../model/index.document';
import { ZdmMapper } from './zdm.mapper';

export class ZdmWfsMapper extends ZdmMapper<WfsMapper> {

    constructor(baseMapper: WfsMapper) {
        super(baseMapper);
    }

    getDescription(): string {
        var summary = this.baseMapper.select('./wfs:Abstract', this.baseMapper.featureOrFeatureType, true)?.textContent;
        var name = this.baseMapper.getTypename();
        var portal = "Küstendaten";
        var featureSummary = "WebFeatureService (WFS) " + portal + ", FeatureType: " + name + "<br>";
        featureSummary += "Dieser FeatureType umfasst <b>" + this.baseMapper.getNumberOfFeatures() + "</b> Feature(s).<br>";
        if(summary) {
            featureSummary += summary + "<br>";
        }
        return featureSummary;
    }

    getAdditionalHtml(): string {
        let bbox = this.getBoundingBox()?.bbox;
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

    getIdf(): string {
        let idfGenerator = new IdfGenerator(this);
        return idfGenerator.createIdf(this.baseMapper.fetched.idx);
    }

    getModifiedDate(): Date{
        return this.baseMapper.getModifiedDate()
    }

    getGeneratedId(): string{
        return this.baseMapper.getGeneratedId()
    }

    getMetadataSource(): MetadataSource {
        return this.baseMapper.getMetadataSource();
    }

    // getHarvestedData(): string{
    //     return this.baseMapper.getHarvestedData();
    // }

    // getHarvestErrors() {
    //     return this.baseMapper.getHarvestingErrors();
    // }

    getIssued(): Date {
        return this.baseMapper.getIssued();
    }

    // getHarvestingDate(): Date {
    //     return this.baseMapper.getHarvestingDate();
    // }

    // isValid() {
    //     return this.baseMapper.isValid();
    // }

    // shouldBeSkipped() {
    //     return this.baseMapper.shouldBeSkipped();
    // }

    // getOriginator(): Agent[]{
    //     return this.baseMapper.getOriginator();
    // }

    executeCustomCode(doc: ZdmIndexDocument) {
        this.baseMapper.executeCustomCode(doc);
    }
}
