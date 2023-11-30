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

import { generatePlanDigitalWmsDistribution } from '../../../profiles/diplanung/diplanung.utils';
import { Distribution} from '../../../model/distribution';
import { DocTypeMapping, PlanTypeMapping, ProcedureTypeMapping } from '../xplan/xplan.codelist.mappings';
import { GeoJsonUtils } from '../../../utils/geojson.utils';
import { MiscUtils } from '../../../utils/misc.utils';
import { PluDocType, PluPlanType, PluProcedureState, PluProcedureType, ProcessStep } from '../../../model/dcatApPlu.model';
import { WfsMapper } from '../wfs.mapper';

export class MsWfsMapper extends WfsMapper {

    getStelleId() {
        return this.getTextContent('./*/ms:stelle_id');
    }

    _getDescription() {
        return this.getTextContent('./*/ms:beschreibung');
    }

    async _getDistributions(): Promise<Distribution[]> {
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
        distributions.push(generatePlanDigitalWmsDistribution(this._getAlternateTitle(), this.getStelleId()));
        return distributions;
    }

    _getTitle() {
        let title = this.getTextContent('./*/ms:name')?.trim();
        return title ?? undefined;
    }

    _getAlternateTitle() {
        let planName = this.getTextContent('./*/ms:plan_name')?.trim();
        return planName ?? undefined;
    }

    _getBoundingBox(): object {
        let envelope = this.select('./*/gml:boundedBy/gml:Envelope', this.feature, true);
        if (envelope) {
            let lowerCorner = this.getTextContent('./gml:lowerCorner', envelope);
            let upperCorner = this.getTextContent('./gml:upperCorner', envelope);
            if (lowerCorner && upperCorner) {
                let crs = (<Element>envelope).getAttribute('srsName');
                return this.fetched.geojsonUtils.getBoundingBox(lowerCorner, upperCorner, crs);
            }
        }
        // if spatial exists, create bbox from it
        else if (this.select('./*/ms:msGeometry', this.feature, true)) {
            return GeoJsonUtils.getBbox(this.getSpatial());
        }
        return undefined;
    }

    _getSpatial(): object {
        let spatialContainer = this.select('./*/ms:msGeometry/*', this.feature, true);
        if (!spatialContainer) {
            // use bounding box as fallback
            return this._getBoundingBox();
        }
        let crs = (<Element>spatialContainer).getAttribute('srsName');
        if (!crs) {
            crs = this.fetched.defaultCrs;
        }
        else if (!crs.startsWith('urn:ogc:def:crs:EPSG::') && !crs.startsWith('EPSG:')) {
            crs = 'EPSG:' + crs;
        }
        let geojson = this.fetched.geojsonUtils.parse(spatialContainer, { crs: crs });
        return geojson;
    }

    /**
     * This is source-specific.
     * 
     * @returns 
     */
    _getSpatialText(): string {
        let msGemeinde = this.getTextContent('./*/ms:gemeinde_dt');
        if (msGemeinde) {
            let gemeindeObj = JSON.parse(msGemeinde);
            return gemeindeObj?.rs ?? gemeindeObj?.rs;
        }
        return undefined;
    }

    // TODO fill in the gaps
    _getPluDocType(code: string): PluDocType {
        return DocTypeMapping[code] ?? PluDocType.UNBEKANNT;
    }

    _getPluPlanType(): PluPlanType {
        let typename = this.getTypename();
        let planart = this.getTextContent('./*/ms:planart');
        if (typename in PlanTypeMapping) {
            return PlanTypeMapping[typename][planart]?.[0] ?? PluPlanType.UNBEKANNT;//PlanTypeMapping[typename].default[0];
        }
        this.log.debug('No pluPlanType available for typename ', typename);
        return PluPlanType.UNBEKANNT;
    }

    _getPluPlanTypeFine(): string {
        let typename = this.getTypename();
        let planart = this.getTextContent('./*/ms:planart');
        if (typename in PlanTypeMapping) {
            return PlanTypeMapping[typename][planart]?.[1] ?? undefined;//PlanTypeMapping[typename].default[1];
        }
        this.log.debug('No pluPlanTypeFine available for typename ', typename);
        return undefined;
    }

    _getPluProcedureState(): PluProcedureState {
        return super._getPluProcedureState();
    }

    _getPluProcedureType(): PluProcedureType {
        let typename = this.getTypename();
        let procedureType = this.getTextContent('./*/ms:verfahren');
        if (typename in ProcedureTypeMapping) {
            return ProcedureTypeMapping[typename][procedureType] ?? PluProcedureType.UNBEKANNT;//ProcedureTypeMapping[typename].default;
        }
        this.log.debug('No pluProcedureType available for ms:verfahren ', procedureType);
        return PluProcedureType.UNBEKANNT;
    }

    _getPluProcessSteps(): ProcessStep[] {
        return undefined;
    }

    _getPluProcedureStartDate(): Date {
        let procedureStartDate = this.getTextContent('./*/ms:aufstellungsbeschlussdatum');
        return MiscUtils.normalizeDateTime(procedureStartDate);
    }

    _getIssued(): Date {
        let issued = this.getTextContent('./*/ms:technherstelldatum');
        return MiscUtils.normalizeDateTime(issued);
    }

    _getModifiedDate(): Date {
        let modified = this.getTextContent('./*/ms:updated_at');
        return MiscUtils.normalizeDateTime(modified);
    }

    _getMetadataHarvested(): Date {
        return new Date(Date.now());
    }
}
