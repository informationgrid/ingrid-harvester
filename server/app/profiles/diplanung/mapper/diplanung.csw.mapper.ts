/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import { PluPlanState, PluPlanType, PluProcedureState, PluProcedureType } from '../../../model/dcatApPlu.model';
import { uniqBy } from 'lodash';
import { Contact } from '../../../model/agent';
import { CswMapper } from '../../../importer/csw/csw.mapper';
import { Distribution } from '../../../model/distribution';
import { RequestDelegate, RequestOptions } from '../../../utils/http-request.utils';
import { WmsXPath } from "../../../importer/csw/wms.xpath";

const DomParser = require('@xmldom/xmldom').DOMParser;

export class DiplanungCswMapper extends CswMapper {

    _getAlternateTitle(): string {
        let alternateTitle = CswMapper.getCharacterStringContent(this.idInfo, 'alternateTitle');
        if (!alternateTitle) {
            alternateTitle = this.getTitle();
        }
        return alternateTitle;
    }

    async _getContactPoint(): Promise<Contact> {
        let contactPoint = this.fetched.contactPoint;
        if (contactPoint) {
            return contactPoint;
        }
        let contacts = await this._getContactPoints();
        if (contacts.length > 0) {
            // use pointOfContact if available
            contactPoint = contacts.find(extContact => extContact.role === 'pointOfContact');
            // otherwise, use the next best
            if (!contactPoint) {
                contactPoint = contacts[0];
            }
            delete contactPoint['role'];
        }
        this.fetched.contactPoint = contactPoint;
        return contactPoint; // TODO index all contacts
    }

    _getBoundingBox() {
        return this.getGeometry(true);
    }

    _getSpatial(): object {
        return this.getGeometry(false);
    }

    private getGeometry(forcePolygon: boolean) {
        let geographicBoundingBoxes = CswMapper.select('(./srv:SV_ServiceIdentification/srv:extent|./gmd:MD_DataIdentification/gmd:extent)/gmd:EX_Extent/gmd:geographicElement/gmd:EX_GeographicBoundingBox', this.idInfo);
        let geometries = [];
        for(let i=0; i < geographicBoundingBoxes.length; i++){
            let geographicBoundingBox = geographicBoundingBoxes[i];
            let west = parseFloat(CswMapper.select('./gmd:westBoundLongitude', geographicBoundingBox, true).textContent.trim());
            let east = parseFloat(CswMapper.select('./gmd:eastBoundLongitude', geographicBoundingBox, true).textContent.trim());
            let south = parseFloat(CswMapper.select('./gmd:southBoundLatitude', geographicBoundingBox, true).textContent.trim());
            let north = parseFloat(CswMapper.select('./gmd:northBoundLatitude', geographicBoundingBox, true).textContent.trim());

            if (!forcePolygon && (west === east && north === south)) {
                geometries.push({
                    'type': 'Point',
                    'coordinates': [west, north]
                });
            }
            else if (!forcePolygon && (west === east || north === south)) {
                geometries.push({
                    'type': 'LineString',
                    'coordinates': [[west, north], [east, south]]
                });
            }
            else {
                geometries.push({
                    'type': 'Polygon',
                    'coordinates': [[[west, north], [west, south], [east, south], [east, north], [west, north]]]
                });
            }
        }
        if(geometries.length == 1){
            return geometries[0];
        }
        else if(geometries.length > 1){
            return {
                'type': 'GeometryCollection',
                'geometries': geometries
            }
        }

        return undefined;
    }

    async _getMaintainers() {
        let maintainers = await super._getMaintainers();
        return uniqBy(maintainers, JSON.stringify);
    }

    _getCatalog() {
        return this.fetched.catalog;
    }

    async _getDistributions(): Promise<Distribution[]> {
        let distributions = [];
        for (let distribution of await super._getDistributions()) {
            // for Diplanung, only use distributions that contain an accessURL
            if (distribution.accessURL) {
                // add layer names for WMS services
                if (distribution.format.includes('WMS') || distribution.accessURL.toLowerCase().includes('wms')) {
                    let response = '';
                    try {
                        response = await this.getWmsResponse(distribution.accessURL);
                    }
                    catch (err) {
                        this.log.warn(err.message);
                        this.summary.warnings.push(['No layer names added for distribution', err.message]);
                    }
                    // rudimentary check for XML
                    if (response.startsWith('<?xml')) {
                        let layerNames = await this.getMapLayerNames(response);
                        if (layerNames) {
                            distribution.mapLayerNames = layerNames;
                        }
                        if (!distribution.format.includes('WMS')) {
                            distribution.format.push('WMS');
                        }
                    }
                }
                // TODO handle Format
                distributions.push({ ...distribution, format: distribution.format });
                // // add layer names for WMS services (version with filtering out non-accessible or non-XML "WMS"-urls)
                // if (distribution.format.includes('WMS') || distribution.accessURL.toLowerCase().includes('wms')) {
                //     try {
                //         let response = await this.getWmsResponse(distribution.accessURL);
                //         // rudimentary check for XML
                //         if (response.startsWith('<?xml')) {
                //             let layerNames = await this.getMapLayerNames(response);
                //             if (layerNames) {
                //                 distribution.mapLayerNames = layerNames;
                //             }
                //             if (!distribution.format.includes('WMS')) {
                //                 distribution.format.push('WMS');
                //             }
                //         }
                //         else {
                //             distribution.format = distribution.format.filter(elem => elem != 'WMS');
                //         }
                //         distributions.push({ ...distribution, format: distribution.format });
                //     }
                //     // catch and re-throw connection errors
                //     catch (e) {
                //         throw e;
                //     }
                // }
                // else {
                //     // TODO handle Format
                //     distributions.push({ ...distribution, format: distribution.format });
                // }
            }
        }
        return distributions;
    }

    private async getWmsResponse(url: string) {
        let serviceRequestConfig: RequestOptions = {
            uri: url.split('?')[0],
            qs: { service: 'WMS', request: 'GetCapabilities' },
        };
        let serviceRequestDelegate = new RequestDelegate(serviceRequestConfig);
        // return await serviceRequestDelegate.doRequest(2, 500);   // retry 2 times, wait 500ms between
        return await serviceRequestDelegate.doRequest();
    }

    private async getMapLayerNames(response: string): Promise<string[]> {
        let serviceResponseDom = new DomParser().parseFromString(response);
        // layer * 2
        let layers = WmsXPath.select('./wms:WMS_Capabilities/wms:Capability/wms:Layer/wms:Layer', serviceResponseDom);
        let layerNames = [];
        for (let layer of layers) {
            let layerName = WmsXPath.select('./wms:Name', layer, true)?.textContent;
            if (layerName) {
                layerNames.push(layerName);
            }
        }
        return layerNames;
    }

    _getPluDevelopmentFreezePeriod() {
        return undefined;
    }

    _getPluPlanState(): PluPlanState {
        let planState = this.settings.pluPlanState;
        switch (planState?.toLowerCase()) {
            case 'festgesetzt': return PluPlanState.FESTGES;
            case 'in aufstellung': return PluPlanState.IN_AUFST;
            default: return PluPlanState.UNBEKANNT;
        }
    }

    /**
     * Heuristic based on metadata harvested from gdi-de.
     */
    // TODO extend
    _getPluPlanType(): string {
        // consider title, description, and keywords
        let searchFields = [];
        searchFields.push(this.getTitle());
        searchFields.push(this.getDescription());
        searchFields.push(...this.getKeywords());
        let haystack = searchFields.join('#').toLowerCase();

        // TODO especially in keywords - if set - there can be ambiguities, e.g. keywords contain multiple determination words
        if (['bebauungsplan'].some(needle => haystack.includes(needle))) {
            return PluPlanType.BEBAU_PLAN;
        }
        if (['flächennutzungsplan', 'fnp'].some(needle => haystack.includes(needle))) {
            return PluPlanType.FLAECHENN_PLAN;
        }
        if ([].some(needle => haystack.includes(needle))) {
            return PluPlanType.PLAN_FESTST_VERF;
        }
        if ([].some(needle => haystack.includes(needle))) {
            return PluPlanType.PW_BES_STAEDT_BAUR;
        }
        if ([].some(needle => haystack.includes(needle))) {
            return PluPlanType.PW_LANDSCH_PLAN;
        }
        if ([].some(needle => haystack.includes(needle))) {
            return PluPlanType.RAUM_ORDN_PLAN;
        }
        if (['raumordnungsverfahren'].some(needle => haystack.includes(needle))) {
            return PluPlanType.RAUM_ORDN_VERF;
        }
        if (['städtebauliche satzungen'].some(needle => haystack.includes(needle))) {
            return PluPlanType.STAEDT_BAUL_SATZ;
        }
        return PluPlanType.UNBEKANNT;
    }

    _getPluProcedureState(): string {
        switch (this._getPluPlanState()) {
            case PluPlanState.FESTGES: return PluProcedureState.ABGESCHLOSSEN;
            case PluPlanState.IN_AUFST: return PluProcedureState.LAUFEND;
            default: return PluProcedureState.UNBEKANNT;
        }
    }

    _getPluPlanTypeFine() {
        return undefined;
    }

    _getPluProcedureStartDate() {
        return undefined;
    }

    _getPluProcedureType() {
        return PluProcedureType.UNBEKANNT;
    }

    _getPluProcessSteps() {
        return undefined;
    }
}