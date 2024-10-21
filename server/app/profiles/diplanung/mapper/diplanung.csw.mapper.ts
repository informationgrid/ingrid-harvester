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

import { uniqBy } from 'lodash';
import { Catalog, PluPlanState, PluPlanType, PluProcedureState, PluProcedureType, ProcessStep } from '../../../model/dcatApPlu.model';
import { Contact, Organization, Person } from '../../../model/agent';
import { CswMapper } from '../../../importer/csw/csw.mapper';
import { DateRange } from '../../../model/dateRange';
import { DiplanungMapper } from './diplanung.mapper';
import { Distribution } from '../../../model/distribution';
import { Geometry, GeometryCollection, Point } from '@turf/helpers';

const alternateTitleBlacklist = ['B-Plan', 'F-Plan'];

export class DiplanungCswMapper extends DiplanungMapper<CswMapper> {

    constructor(baseMapper: CswMapper) {
        super(baseMapper);
    }

    async getContactPoint(): Promise<Contact> {
        let contactPoint = this.baseMapper.fetched.contactPoint;
        if (contactPoint) {
            return contactPoint;
        }
        let contacts = await this.baseMapper.getContactPoints();
        if (contacts.length > 0) {
            // use pointOfContact if available
            contactPoint = contacts.find(extContact => extContact.role === 'pointOfContact');
            // otherwise, use the next best
            if (!contactPoint) {
                contactPoint = contacts[0];
            }
            delete contactPoint['role'];
        }
        this.baseMapper.fetched.contactPoint = contactPoint;
        return contactPoint;
    }

    getDescription(): string {
        return this.baseMapper.getDescription();
    }

    getUuid(): string {
        return this.baseMapper.getGeneratedId();
    }

    getAdmsIdentifier(): string {
        return undefined;
    }

    getTitle(): string {
        return this.baseMapper.getTitle();
    }

    getPluDevelopmentFreezePeriod(): DateRange {
        return undefined;
    }

    getPluPlanName(): string {
        let alternateTitle = CswMapper.select('./*/gmd:citation/gmd:CI_Citation/gmd:alternateTitle/gco:CharacterString', this.baseMapper.idInfo, true)?.textContent;
        if (!alternateTitle || alternateTitleBlacklist.includes(alternateTitle)) {
            alternateTitle = this.getTitle();
        }
        return alternateTitle;
    }

    getPluProcedurePeriod(): DateRange {
        let ranges: DateRange[] = this.baseMapper.getTemporal() ?? [];
        let gte: Date;
        let lte: Date;
        // extract the earliest and latest date
        for (let range of ranges) {
            if (!gte || gte < range.gte) {
                gte = range.gte;
            }
            if (!lte || lte > range.lte) {
                lte = range.lte;
            }
        }
        return { gte, lte };
    }

    getPluPlanState(): PluPlanState {
        return this.baseMapper.settings.pluPlanState;
    }

    /**
     * Heuristic based on metadata harvested from gdi-de.
     */
    getPluPlanType(): PluPlanType {
        // consider title, description, and keywords
        let searchFields = [];
        searchFields.push(this.getTitle());
        searchFields.push(this.getDescription());
        searchFields.push(...this.getKeywords());
        let haystack = searchFields.join('#').toLowerCase();


        // TODO hack for MROK presentation, remove again and improve/refine the if-cascade below
        if (this.baseMapper.settings.sourceURL == 'https://numis.niedersachsen.de/202/csw') {
            return PluPlanType.RAUM_ORDN_PLAN;
        }


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

    getPluPlanTypeFine(): string {
        return undefined;
    }

    // Source of mapping -> https://www.dev.diplanung.de/DefaultCollection/EfA%20DiPlanung/_workitems/edit/20548
    getPluProcedureState(): PluProcedureState {
        switch (this.getPluPlanState()) {
            case PluPlanState.SIMULIERT: return PluProcedureState.SIMULIERT;
            case PluPlanState.IN_AUFST: return PluProcedureState.LAUFEND;
            case PluPlanState.FESTGES: return PluProcedureState.ABGESCHLOSSEN;
            case PluPlanState.GANZ_AUFGEHOBEN: return PluProcedureState.GANZ_AUFGEHOBEN;
            case PluPlanState.EINGESTELLT: return PluProcedureState.EINGESTELLT;
            default: return PluProcedureState.UNBEKANNT;
        }
    }

    getPluProcedureType(): PluProcedureType {
        return PluProcedureType.UNBEKANNT;
    }

    getPluProcessSteps(): ProcessStep[] {
        return undefined;
    }

    getPluNotification(): string {
        return undefined;
    }

    getBoundingBox(): Geometry | GeometryCollection {
        return this.baseMapper.getGeometry(true);
    }

    getCentroid(): Point {
        return this.baseMapper.getCentroid();
    }

    getSpatial(): Geometry | GeometryCollection {
        return this.baseMapper.getSpatial();
    }

    getSpatialText(): string {
        let spatialText = this.baseMapper.getSpatialText();
        return spatialText?.match(/(\d{12}).+/)?.[1] ?? spatialText;
    }

    getRelation(): string {
        return undefined;
    }

    async getCatalog(): Promise<Catalog> {
        return this.baseMapper.fetched.catalog;
    }

    async getPublisher(): Promise<Person[] | Organization[]> {
        return this.baseMapper.getPublisher();
    }

    async getMaintainers(): Promise<Person[] | Organization[]> {
        let maintainers = await this.baseMapper.getMaintainers();
        return uniqBy(maintainers, JSON.stringify);
    }

    async getContributors(): Promise<Person[] | Organization[]> {
        return undefined;
    }

    async getDistributions(): Promise<Distribution[]> {
        let distributions = await this.baseMapper.getDistributions();
        return distributions?.filter(distribution => distribution.accessURL);

    }

    getIssued(): Date {
        return undefined;
    }

    getKeywords(): string[] {
        return this.baseMapper.getKeywords();
    }

    getModifiedDate(): Date {
        return undefined;
    }

    // _getSpatial(): object {
    //     // TODO
    //     // let polygon = CswMapper.select('(./srv:SV_ServiceIdentification/srv:extent|./gmd:MD_DataIdentification/gmd:extent)/gmd:EX_Extent/gmd:geographicElement/gmd:EX_BoundingPolygon', this.idInfo);
    //     return undefined;
    // }

    protected getGeoJson(west: number, east: number, north: number, south: number, forcePolygon: boolean): any {
        if (!forcePolygon && (west === east && north === south)) {
            return {
                'type': 'Point',
                'coordinates': [west, north]
            };
        }
        else if (west === east || north === south) {
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

    // TODO this is a hack for the DiPlanung MVP to not return any datasets that only have a CSW source
    // now handled solely in `server/app/profiles/diplanung/persistence/postgres.utils.ts`
    // public isValid() {
    //     return false;
    // }
}
