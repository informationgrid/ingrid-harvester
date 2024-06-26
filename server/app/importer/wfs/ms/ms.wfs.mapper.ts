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

import * as GeoJsonUtils from '../../../utils/geojson.utils';
import * as MiscUtils from '../../../utils/misc.utils';
import { generatePlanDigitalWmsDistribution } from '../../../profiles/diplanung/diplanung.utils';
import { DateRange } from '../../../model/dateRange';
import { Distribution} from '../../../model/distribution';
import { DocTypeMapping, PlanTypeMapping, ProcedureTypeMapping } from '../xplan/xplan.codelist.mappings';
import { Geometries, Geometry } from '@turf/helpers';
import { PluDocType, PluPlanType, PluProcedureState, PluProcedureType, ProcessStep } from '../../../model/dcatApPlu.model';
import { WfsMapper } from '../wfs.mapper';

export class MsWfsMapper extends WfsMapper {

    getStelleId(): string {
        return this.getTextContent('./*/ms:stelle_id');
    }

    getDescription(): string {
        return this.getTextContent('./*/ms:beschreibung');
    }

    async getDistributions(): Promise<Distribution[]> {
        let distributions = [];
        let msExterneReferenz = this.getTextContent('./*/ms:externereferenz_dt');
        if (msExterneReferenz) {
            let externeReferenzList = JSON.parse('[' + msExterneReferenz + ']');
            for (let externeReferenzObj of externeReferenzList) {
                let distribution: Distribution = {
                    accessURL: externeReferenzObj.referenzurl,
                    description: externeReferenzObj.referenzname,
                    format: [Object.keys(externeReferenzObj.referenzmimetype).length == 0 ? 'Unbekannt' : JSON.stringify(externeReferenzObj.referenzmimetype)]
                };
                distributions.push(distribution);
            }
        }
        distributions.push(generatePlanDigitalWmsDistribution(this.getPlanName(), this.getStelleId()));
        return distributions;
    }

    getTitle(): string {
        let title = this.getTextContent('./*/ms:name')?.trim();
        return title ?? undefined;
    }

    getPlanName(): string {
        let planName = this.getTextContent('./*/ms:plan_name')?.trim();
        return planName ?? undefined;
    }

    getBoundingBox(): Geometry {
        let envelope = this.select('./*/gml:boundedBy/gml:Envelope', this.feature, true);
        if (envelope) {
            let lowerCorner = this.getTextContent('./gml:lowerCorner', envelope);
            let upperCorner = this.getTextContent('./gml:upperCorner', envelope);
            if (lowerCorner && upperCorner) {
                let crs = (<Element>envelope).getAttribute('srsName');
                return GeoJsonUtils.getBoundingBox(lowerCorner, upperCorner, crs);
            }
        }
        // if spatial exists, create bbox from it
        else if (this.select('./*/ms:msGeometry', this.feature, true)) {
            return GeoJsonUtils.getBbox(this.getSpatial());
        }
        return undefined;
    }

    getSpatial(): Geometry | Geometries {
        let spatialContainer = this.select('./*/ms:msGeometry/*', this.feature, true);
        if (!spatialContainer) {
            // use bounding box as fallback
            return this.getBoundingBox();
        }
        let crs = (<Element>spatialContainer).getAttribute('srsName') ?? this.fetched.defaultCrs;
        crs = crs.replace('urn:ogc:def:crs:EPSG::', '').replace('EPSG:', '');
        let geojson = GeoJsonUtils.parse(spatialContainer, { crs }, this.fetched.nsMap);
        return geojson;
    }

    /**
     * This is source-specific.
     * 
     * @returns 
     */
    getSpatialText(): string {
        let msGemeinde = this.getTextContent('./*/ms:gemeinde_dt');
        if (msGemeinde) {
            let gemeindeObj = JSON.parse(msGemeinde);
            return gemeindeObj?.rs ?? gemeindeObj?.rs;
        }
        return undefined;
    }

    // TODO fill in the gaps
    getPluDocType(code: string): PluDocType {
        return DocTypeMapping[code] ?? PluDocType.UNBEKANNT;
    }

    getPluPlanType(): PluPlanType {
        let typename = this.getTypename();
        let planart = this.getTextContent('./*/ms:planart');
        if (typename in PlanTypeMapping) {
            return PlanTypeMapping[typename][planart]?.[0] ?? PluPlanType.UNBEKANNT;//PlanTypeMapping[typename].default[0];
        }
        this.log.debug('No pluPlanType available for typename ', typename);
        return PluPlanType.UNBEKANNT;
    }

    getPluPlanTypeFine(): string {
        let typename = this.getTypename();
        let planart = this.getTextContent('./*/ms:planart');
        if (typename in PlanTypeMapping) {
            return PlanTypeMapping[typename][planart]?.[1] ?? undefined;//PlanTypeMapping[typename].default[1];
        }
        this.log.debug('No pluPlanTypeFine available for typename ', typename);
        return undefined;
    }

    getPluProcedureState(): PluProcedureState {
        return super.getPluProcedureState();
    }

    getPluProcedureType(): PluProcedureType {
        let typename = this.getTypename();
        let procedureType = this.getTextContent('./*/ms:verfahren');
        if (typename in ProcedureTypeMapping) {
            return ProcedureTypeMapping[typename][procedureType] ?? PluProcedureType.UNBEKANNT;//ProcedureTypeMapping[typename].default;
        }
        this.log.debug('No pluProcedureType available for ms:verfahren ', procedureType);
        return PluProcedureType.UNBEKANNT;
    }

    getPluProcessSteps(): ProcessStep[] {
        return undefined;
    }

    getPluProcedurePeriod(): DateRange {
        let procedureStartDate = this.getTextContent('./*/ms:aufstellungsbeschlussdatum');
        return { gte: MiscUtils.normalizeDateTime(procedureStartDate) };
    }

    getIssued(): Date {
        let issued = this.getTextContent('./*/ms:technherstelldatum');
        return MiscUtils.normalizeDateTime(issued);
    }

    getModifiedDate(): Date {
        let modified = this.getTextContent('./*/ms:updated_at');
        return MiscUtils.normalizeDateTime(modified);
    }

    getHarvestingDate(): Date {
        return new Date(Date.now());
    }
}
