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

import { uniqBy } from 'lodash';
import { Contact } from '../../../model/agent';
import { CswMapper } from '../../../importer/csw/csw.mapper';
import { Distribution } from '../../../model/distribution';
import { PluPlanState, PluPlanType, PluProcedureState, PluProcedureType } from '../../../model/dcatApPlu.model';

export class DiplanungCswMapper extends CswMapper {

    _getAlternateTitle(): string {
        let alternateTitle = CswMapper.select('./*/gmd:citation/gmd:CI_Citation/gmd:alternateTitle/gco:CharacterString', this.idInfo, true)?.textContent;
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

    protected getGeoJson(west: number, east: number, north: number, south: number, forcePolygon: boolean): any {
        if (!forcePolygon && (west === east && north === south)) {
            return {
                'type': 'Point',
                'coordinates': [west, north]
            };
        }
        else if (!forcePolygon && (west === east || north === south)) {
            return {
                'type': 'LineString',
                'coordinates': [[west, north], [east, south]]
            };
        }
        else {
            return {
                'type': 'Polygon',
                'coordinates': [[[west, north], [west, south], [east, south], [east, north], [west, north]]]
            };
        }
    }

    _getSpatialText(): string {
        let spatialText = super._getSpatialText();
        return spatialText?.match(/(\d{12}).+/)?.[1] ?? spatialText;
    }

    async _getMaintainers() {
        let maintainers = await super._getMaintainers();
        return uniqBy(maintainers, JSON.stringify);
    }

    _getCatalog() {
        return this.fetched.catalog;
    }

    async _getDistributions(): Promise<Distribution[]> {
        let distributions = await super._getDistributions()
        return distributions?.filter(distribution => distribution.accessURL);
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