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
import { ZdmMapper } from './zdm.mapper';
import { ZdmIndexDocument } from '../model/index.document';

export class ZdmWfsMapper extends ZdmMapper<WfsMapper> {

    constructor(baseMapper: WfsMapper) {
        super(baseMapper);
    }

    // getName(): string {
    //     return this.baseMapper.select('./wfs:Name', this.baseMapper.featureOrFeatureType, true)?.textContent;
    // }

    // getTitle(): string {
    //     return this.baseMapper.select('./wfs:Title', this.baseMapper.featureOrFeatureType, true)?.textContent;
    // }

    // getDescription(): string {
    //     return this.baseMapper.select('./wfs:Abstract', this.baseMapper.featureOrFeatureType, true)?.textContent;
    // }

    // returns child features if this is a featuretype, else null
    getFeatures(): ZdmIndexDocument[] {
        return [];
    }

    // getBoundingBox(): Geometry {
    //     if (this.isFeatureType()) {
    //         const select = this.baseMapper.select;
    //         // let srs = select('./wfs:DefaultSRS', this.baseMapper.featureOrFeatureType, true)?.textContent;
    //         let srs = 'WGS84';
    //         let bbox = select('./ows:WGS84BoundingBox', this.baseMapper.featureOrFeatureType, true);
    //         let lowerCorner = select('./ows:LowerCorner', bbox, true)?.textContent;
    //         let upperCorner = select('./ows:UpperCorner', bbox, true)?.textContent;
    //         return GeojsonUtils.getBoundingBox(lowerCorner, upperCorner, srs);
    //     }
    //     else {
    //         return this.baseMapper.getBoundingBox();
    //     }
    // }

    getAdditionalHtml(): string {
        let bbox = this.getBoundingBox()?.bbox;
        if (!bbox) {
            return null;
        }
        // Latitude first (Breitengrad = y), longitude second (Laengengrad = x)
        var S = Number(bbox[1]); // SOUTH y1
        var E = Number(bbox[2]); // EAST, x2

        // transform "WGS 84 (EPSG:4326)" to "ETRS89 / UTM zone 32N (EPSG:25832)"
        // var transfCoords = CoordTransformUtil.getInstance().transform(
        //         E, S,
        //         CoordTransformUtil.getInstance().getCoordTypeByEPSGCode("25832"),
        //         CoordTransformUtil.getInstance().getCoordTypeByEPSGCode("4326"));
        let transfCoords = GeojsonUtils.project(E, S, 'WGS84', '25832')
        var E_4326 = transfCoords[0];
        var S_4326 = transfCoords[1];

        // lowerCorner and upperCorner have same coordinates !? -> BBOX is a POINT !
        var BBOX = "" + (E_4326 - 0.048) + "," + (S_4326 - 0.012) + "," + (E_4326 + 0.048) + "," + (S_4326 + 0.012);

        var addHtml = "" +
            "<div style=\"background-image: url(https://sgx.geodatenzentrum.de/wms_topplus_open?VERSION=1.3.0&amp;REQUEST=GetMap&amp;CRS=CRS:84&amp;BBOX=" + BBOX +
            "&amp;LAYERS=web&amp;FORMAT=image/png&amp;STYLES=&amp;WIDTH=480&amp;HEIGHT=120); left: 0px; top: 0px; width: 480px; height: 120px; margin: 10px 0 0 0;\">" +
            "</div>";

        return addHtml;
    }

    getIdf(): string {
        let idfGenerator = new IdfGenerator(this.baseMapper);
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
