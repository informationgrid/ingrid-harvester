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

import * as GeojsonUtils from '../../../../utils/geojson.utils.js';
import type { MetadataSource } from '../../../../model/index.document.js';
import { ingridWfsMapper } from '../ingrid.wfs.mapper.js';
import { ZdmIdfGenerator } from './zdm.idf.generator.js';

export class ZdmWfsMapper extends ingridWfsMapper {

    getSummary(): string {
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
        let bbox = this.baseMapper.getBoundingBox()?.bbox;
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

    getCustomEntries(): Object {
        return {
            is_feature_type: this.baseMapper.isFeatureType(),
            typename: this.baseMapper.getTypename(),
            number_of_features: this.baseMapper.getNumberOfFeatures(),
            map_iframe: this.getMapIFrame(250),
        };
    }

    getMapIFrame(height: number): string {
        let mapLink = '';
        let serviceURL = encodeURIComponent(`${this.getMetadataSource().source_base}?SERVICE=WFS&VERSION=${this.baseMapper.settings.version}&`);
        mapLink += '/DE/dienste/ingrid-webmap-client/frontend/prd/embed.html?layers=';
        mapLink += 'WFS%7C%7C' + encodeURIComponent(this.getTitle().replaceAll(',','') + ' (WFS)') + '%7C%7C' + serviceURL + '%7C%7C' + this.baseMapper.getTypename();
        mapLink += '%2C';
        let wmsURL = serviceURL.split('%3F')[0];
        mapLink += 'WMS%7C%7C' + encodeURIComponent(this.getTitle().replaceAll(',','') + ' (WMS)') + '%7C%7C' + wmsURL + '%3F%7C%7C' + this.baseMapper.getTypename() + '%7C%7C1.3.0%7C%7Ctrue%7C%7Cfalse%7C%7CInformationstechnikzentrum%2520Bund%252C%2520Dienstsitz%2520Ilmenau%7C%7Chttps%3A%2F%2Fwww.kuestendaten.de%2FDE%2Fdynamisch%2Fkuestendaten_ogc%2Fbs%3F';
        return '<iframe src="' + mapLink + '" height="' + height + '" frameborder="0" style="border:0"></iframe>';
    }

    getIDF(): string {
        let idfGenerator = new ZdmIdfGenerator(this);
        return idfGenerator.createIdf(this.baseMapper.fetched.idx);
    }

    getSpatial() {
        return this.baseMapper.getBoundingBox();
    }

    getModifiedDate(): Date{
        return this.baseMapper.getModifiedDate()
    }

    getMetadataSource(): MetadataSource {
        return this.baseMapper.getMetadataSource();
    }

    getIssued(): Date {
        return this.baseMapper.getIssued();
    }
}
