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

import { pluPlanState, pluPlanType, pluProcedureState } from '../../../model/dcatApPlu.model';
import { Contact } from '../../../model/agent';
import { CswMapper } from '../../../importer/csw/csw.mapper';
import { Distribution } from '../../../model/distribution';

export class DiplanungCswMapper extends CswMapper {

    _getAlternateTitle(): string {
        let alternateTitle = CswMapper.getCharacterStringContent(this.idInfo, 'alternateTitle');
        if (!alternateTitle) {
            alternateTitle = this._getTitle();
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

    _getBoundingBoxGml() {
        return undefined;
    }

    _getBoundingBox() {
        let geographicBoundingBoxes = CswMapper.select('(./srv:SV_ServiceIdentification/srv:extent|./gmd:MD_DataIdentification/gmd:extent)/gmd:EX_Extent/gmd:geographicElement/gmd:EX_GeographicBoundingBox', this.idInfo);
        let geometries = [];
        for(let i=0; i < geographicBoundingBoxes.length; i++){
            let geographicBoundingBox = geographicBoundingBoxes[i];
            let west = parseFloat(CswMapper.select('./gmd:westBoundLongitude', geographicBoundingBox, true).textContent.trimLeft().trim());
            let east = parseFloat(CswMapper.select('./gmd:eastBoundLongitude', geographicBoundingBox, true).textContent.trimLeft().trim());
            let south = parseFloat(CswMapper.select('./gmd:southBoundLatitude', geographicBoundingBox, true).textContent.trimLeft().trim());
            let north = parseFloat(CswMapper.select('./gmd:northBoundLatitude', geographicBoundingBox, true).textContent.trimLeft().trim());

            geometries.push({
                'type': 'Envelope',
                'coordinates': [[west, north], [east, south]]
            });
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

    _getCatalog() {
        return this.fetched.catalog;
    }

    async _getDistributions(): Promise<Distribution[]> {
        let distributions = [];
        for (let distribution of await super._getDistributions()) {
            if (distribution.accessURL) {
                distributions.push({ ...distribution, format: distribution.format });
            }
        }
        return distributions;
    }

    _getPluDevelopmentFreezePeriod() {
        return undefined;
    }

    // TODO check
    _getPluPlanState(): string {
        let planState;
        try {
            planState = CswMapper.select(this.settings.pluPlanState, this.record, true)?.textContent;
        }
        finally {
            if (!planState) {
                planState = this.settings.pluPlanState;
            }
        }
        if (['ja', 'festgesetzt'].includes(planState?.toLowerCase())) {
            return pluPlanState.FESTGES;
        }
        else if (['nein', 'in aufstellung'].includes(planState?.toLowerCase())) {
            return pluPlanState.IN_AUFST;
        }
        return pluPlanState.UNBEKANNT;
    }

    /**
     * Heuristic based on metadata harvested from gdi-de.
     * 
     * // TODO extend
     */
    _getPluPlanType(): string {
        // consider title, description, and keywords
        let searchFields = [];
        searchFields.push(this._getTitle());
        searchFields.push(this._getDescription());
        searchFields.push(...this._getKeywords());
        let haystack = searchFields.join('#').toLowerCase();

        // TODO especially in keywords - if set - there can be ambiguities, e.g. keywords contain multiple determination words
        if (['bebauungsplan'].some(needle => haystack.includes(needle))) {
            return pluPlanType.BEBAU_PLAN;
        }
        if (['flächennutzungsplan', 'fnp'].some(needle => haystack.includes(needle))) {
            return pluPlanType.FLAECHENN_PLAN;
        }
        if ([].some(needle => haystack.includes(needle))) {
            return pluPlanType.PLAN_FESTST_VERF;
        }
        if ([].some(needle => haystack.includes(needle))) {
            return pluPlanType.PW_BES_STAEDT_BAUR;
        }
        if ([].some(needle => haystack.includes(needle))) {
            return pluPlanType.PW_LANDSCH_PLAN;
        }
        if ([].some(needle => haystack.includes(needle))) {
            return pluPlanType.RAUM_ORDN_PLAN;
        }
        if (['raumordnungsverfahren'].some(needle => haystack.includes(needle))) {
            return pluPlanType.RAUM_ORDN_VERF;
        }
        if (['städtebauliche satzungen'].some(needle => haystack.includes(needle))) {
            return pluPlanType.STAEDT_BAUL_SATZ;
        }
        return pluPlanType.UNBEKANNT;
    }

    _getPluProcedureState(): string {
        switch (this._getPluPlanState()) {
            case pluPlanState.FESTGES: return pluProcedureState.ABGESCHLOSSEN;
            case pluPlanState.IN_AUFST: return pluProcedureState.LAUFEND;
            default: return pluProcedureState.UNBEKANNT;
        }
    }

    _getPluPlanTypeFine() {
        return undefined;
    }

    _getPluProcedureStartDate() {
        return undefined;
    }

    _getPluProcedureType() {
        return undefined;
    }

    _getPluProcessSteps() {
        return undefined;
    }
}