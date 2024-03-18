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

import * as GeoJsonUtils from '../../../utils/geojson.utils';
import * as MiscUtils from '../../../utils/misc.utils';
import { Distribution} from '../../../model/distribution';
import { DocTypeMapping, PlanTypeMapping, ProcedureTypeMapping } from './xplan.codelist.mappings';
import { Geometries, Geometry } from '@turf/helpers';
import { PluDocType, PluPlanType, PluProcedureState, PluProcedureType, ProcessStep } from '../../../model/dcatApPlu.model';
import { WfsMapper } from '../wfs.mapper';

export class XplanWfsMapper extends WfsMapper {

    getDescription() {
        return this.getTextContent('./*/xplan:beschreibung');
    }

    async getDistributions(): Promise<Distribution[]> {
        let distributions = [];
        for (let elem of this.select('./*/xplan:externeReferenz/xplan:XP_SpezExterneReferenz', this.feature)) {
            let distribution: Distribution = {
                accessURL: this.getTextContent('./xplan:referenzURL', elem),
                description: this.getTextContent('./xplan:art', elem),
                format: [this.getTextContent('./xplan:referenzMimeType', elem)],
                pluDocType: this.getPluDocType(this.getTextContent('./xplan:typ', elem))
            };
            distributions.push(distribution);
        }
        return distributions;
    }

    getTitle() {
        let title = this.getTextContent('./*/xplan:name')?.trim();
        return title ?? undefined;
    }

    getAlternateTitle() {
        let planName = this.getTextContent('./*/xplan:planName')?.trim();
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
        else if (this.select('./*/xplan:raeumlicherGeltungsbereich', this.feature, true)) {
            return GeoJsonUtils.getBbox(this.getSpatial());
        }
        return undefined;
    }

    getSpatial(): Geometry | Geometries {
        let spatialContainer = this.select('./*/xplan:raeumlicherGeltungsbereich/*', this.feature, true);
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
    // TODO check
    getSpatialText(): string {
        let xpGemeinde = this.select('./*/xplan:gemeinde/xplan:XP_Gemeinde', this.feature, true);
        if (xpGemeinde) {
            let rs = this.getTextContent('./xplan:rs', xpGemeinde);
            if (!rs) {
                let ags = this.getTextContent('./xplan:ags', xpGemeinde);
                let ortsteil = this.getTextContent('./xplan:ortsteilName', xpGemeinde);
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
        return this.fetched.regionalschluessel.filter((aRs: string) => r.test(aRs));
    }

    // TODO fill in the gaps
    getPluDocType(code: string): PluDocType {
        return DocTypeMapping[code] ?? PluDocType.UNBEKANNT;
    }

    getPluPlanType(): PluPlanType {
        let typename = this.getTypename();
        let planart = this.getTextContent('./*/xplan:planArt');
        if (typename in PlanTypeMapping) {
            return PlanTypeMapping[typename][planart]?.[0] ?? PluPlanType.UNBEKANNT;//PlanTypeMapping[typename].default[0];
        }
        this.log.debug('No pluPlanType available for typename ', typename);
        return PluPlanType.UNBEKANNT;
    }

    getPluPlanTypeFine(): string {
        let typename = this.getTypename();
        let planart = this.getTextContent('./*/xplan:planArt');
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
        let procedureType = this.getTextContent('./*/xplan:verfahren');
        if (typename in ProcedureTypeMapping) {
            return ProcedureTypeMapping[typename][procedureType] ?? PluProcedureType.UNBEKANNT;//ProcedureTypeMapping[typename].default;
        }
        this.log.debug('No pluProcedureType available for xplan:verfahren ', procedureType);
        return PluProcedureType.UNBEKANNT;
    }

    // TODO
    getPluProcessSteps(): ProcessStep[] {
        return undefined;
    }

    getPluProcedureStartDate(): Date {
        let procedureStartDate = this.getTextContent('./*/xplan:aufstellungsbeschlussDatum');
        return MiscUtils.normalizeDateTime(procedureStartDate);
    }

    getIssued(): Date {
        let issued = this.getTextContent('./*/xplan:technHerstellDatum');
        return MiscUtils.normalizeDateTime(issued);
    }

    getHarvestingDate(): Date {
        return new Date(Date.now());
    }
}
