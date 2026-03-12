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

import * as GeoJsonUtils from '../../../../utils/geojson.utils.js';
import * as MiscUtils from '../../../../utils/misc.utils.js';
import type { DateRange } from '../../../../model/dateRange.js';
import { DiplanungWfsMapper } from '../diplanung.wfs.mapper.js';
import type { Distribution} from '../../../../model/distribution.js';
import { DocTypeMapping, PlanTypeMapping, ProcedureTypeMapping } from './xplan.codelist.mappings.js';
import type { Geometry } from 'geojson';
import type { PluProcedureState, ProcessStep } from '../../../../model/dcatApPlu.model.js';
import { PluDocType, PluPlanType, PluProcedureType } from '../../../../model/dcatApPlu.model.js';

export class XplanWfsMapper extends DiplanungWfsMapper {

    getDescription(): string {
        return this.baseMapper.getTextContent('./*/xplan:beschreibung');
    }

    async getDistributions(): Promise<Distribution[]> {
        let distributions = [];
        for (let elem of this.baseMapper.select('./*/xplan:externeReferenz/xplan:XP_SpezExterneReferenz', this.baseMapper.featureOrFeatureType)) {
            let distribution: Distribution = {
                accessURL: this.baseMapper.getTextContent('./xplan:referenzURL', elem),
                description: this.baseMapper.getTextContent('./xplan:art', elem),
                format: [this.baseMapper.getTextContent('./xplan:referenzMimeType', elem)],
                pluDocType: this.getPluDocType(this.baseMapper.getTextContent('./xplan:typ', elem))
            };
            distributions.push(distribution);
        }
        return distributions;
    }

    getPlanName(): string {
        let planName = this.baseMapper.getTextContent('./*/xplan:planName')?.trim();
        return planName ?? undefined;
    }

    getBoundingBox(): Geometry {
        let envelope = this.baseMapper.select('./*/gml:boundedBy/gml:Envelope', this.baseMapper.featureOrFeatureType, true);
        if (envelope) {
            let lowerCorner = this.baseMapper.getTextContent('./gml:lowerCorner', envelope);
            let upperCorner = this.baseMapper.getTextContent('./gml:upperCorner', envelope);
            if (lowerCorner && upperCorner) {
                let crs = (<Element>envelope).getAttribute('srsName');
                return GeoJsonUtils.getBoundingBox(lowerCorner, upperCorner, crs);
            }
        }
        // if spatial exists, create bbox from it
        else if (this.baseMapper.select('./*/xplan:raeumlicherGeltungsbereich', this.baseMapper.featureOrFeatureType, true)) {
            return GeoJsonUtils.getBbox(this.getSpatial());
        }
        return undefined;
    }

    getSpatial(): Geometry {
        let spatialContainer = this.baseMapper.select('./*/xplan:raeumlicherGeltungsbereich/*', this.baseMapper.featureOrFeatureType, true);
        if (!spatialContainer) {
            // use bounding box as fallback
            return this.getBoundingBox();
        }
        let crs = (<Element>spatialContainer).getAttribute('srsName') ?? this.baseMapper.fetched.defaultCrs;
        crs = crs.replace('urn:ogc:def:crs:EPSG::', '').replace('EPSG:', '');
        let geojson = GeoJsonUtils.parse(spatialContainer, { crs }, this.baseMapper.fetched.nsMap);
        return geojson;
    }

    /**
     * This is source-specific.
     * 
     * @returns 
     */
    // TODO check
    getSpatialText(): string {
        let xpGemeinde = this.baseMapper.select('./*/xplan:gemeinde/xplan:XP_Gemeinde', this.baseMapper.featureOrFeatureType, true);
        if (xpGemeinde) {
            let rs = this.baseMapper.getTextContent('./xplan:rs', xpGemeinde);
            if (!rs) {
                let ags = this.baseMapper.getTextContent('./xplan:ags', xpGemeinde);
                let ortsteil = this.baseMapper.getTextContent('./xplan:ortsteilName', xpGemeinde);
                if (ags) {
                    if (ortsteil && ortsteil.match("^\\d{3}$")) {
                        rs = ags.substring(0, 2) + "\\d{3}0" + ortsteil + ortsteil;
                        if (this.findLegalRs(rs).length == 0) {
                            rs = ags.substring(0, 2) + "\\d{7}" + ortsteil;
                        }
                    }
                    else {
                        rs = ags.substring(0, 2) + "\\d{7}" + ags.substring(5, 8);
                    }
                }
            }
            let existingRs = this.findLegalRs(rs);
            if (existingRs.length == 1) {
                return existingRs[0];
            }
        }
        return undefined;
    }

    /**
     * Find existing Regionalschluessel corresponding by the given regex filter.
     */ 
    protected findLegalRs(rsFilter: string): string[] {
        let r = new RegExp(rsFilter);
        return this.baseMapper.fetched.regionalschluessel.filter((aRs: string) => r.test(aRs));
    }

    // TODO fill in the gaps
    getPluDocType(code: string): PluDocType {
        return DocTypeMapping[code] ?? PluDocType.UNBEKANNT;
    }

    getPluPlanType(): PluPlanType {
        let typename = this.baseMapper.getTypename();
        let planart = this.baseMapper.getTextContent('./*/xplan:planArt');
        if (typename in PlanTypeMapping) {
            return PlanTypeMapping[typename][planart]?.[0] ?? PluPlanType.UNBEKANNT;//PlanTypeMapping[typename].default[0];
        }
        this.baseMapper.log.debug('No pluPlanType available for typename ', typename);
        return PluPlanType.UNBEKANNT;
    }

    getPluPlanTypeFine(): string {
        let typename = this.baseMapper.getTypename();
        let planart = this.baseMapper.getTextContent('./*/xplan:planArt');
        if (typename in PlanTypeMapping) {
            return PlanTypeMapping[typename][planart]?.[1] ?? undefined;//PlanTypeMapping[typename].default[1];
        }
        this.baseMapper.log.debug('No pluPlanTypeFine available for typename ', typename);
        return undefined;
    }

    getPluProcedureType(): PluProcedureType {
        let typename = this.baseMapper.getTypename();
        let procedureType = this.baseMapper.getTextContent('./*/xplan:verfahren');
        if (typename in ProcedureTypeMapping) {
            return ProcedureTypeMapping[typename][procedureType] ?? PluProcedureType.UNBEKANNT;//ProcedureTypeMapping[typename].default;
        }
        this.baseMapper.log.debug('No pluProcedureType available for xplan:verfahren ', procedureType);
        return PluProcedureType.UNBEKANNT;
    }

    getPluProcedurePeriod(): DateRange {
        let procedureStartDate = this.baseMapper.getTextContent('./*/xplan:aufstellungsbeschlussDatum');
        return { gte: MiscUtils.normalizeDateTime(procedureStartDate) };
    }

    getIssued(): Date {
        let issued = this.baseMapper.getTextContent('./*/xplan:technHerstellDatum');
        return MiscUtils.normalizeDateTime(issued);
    }
}
