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
import { DateRange } from '../../../model/dateRange';
import { Distribution } from '../../../model/distribution';
import { Geometries, Geometry, GeometryCollection, Point } from '@turf/helpers';
import { PluDocType, PluPlanState, PluPlanType, PluProcedureState, PluProcedureType, PluProcessStepType, ProcessStep } from '../../../model/dcatApPlu.model';
import { WfsMapper } from '../wfs.mapper';

export class FisWfsMapper extends WfsMapper {

    getDescription() {
        return this.getTextContent('./*/fis:BEREICH');
    }

    async getDistributions(): Promise<Distribution[]> {
        let distributions = [];
        for (let elem of this.select('./*/fis:*[local-name()="SCAN_WWW" or local-name()="GRUND_WWW"]', this.feature)) {
            let distribution: Distribution = { accessURL: elem.textContent };
            if (MiscUtils.isMaybeDownloadUrl(distribution.accessURL)) {
                distribution.downloadURL = distribution.accessURL;
            }
            distributions.push(distribution);
        }
        return distributions;
    }

    getTitle() {
        let title = this.getTextContent('./*/fis:PLANNAME')?.trim();
        return title ?? undefined;
    }

    getAlternateTitle() {
        return this.getTitle();
    }

    getBoundingBox(): Geometry {
        // if spatial exists, create bbox from it
        if (this.select('./*/fis:SHAPE_25833', this.feature, true)) {
            return GeoJsonUtils.getBbox(this.getSpatial());
        }
        // otherwise, use the general bbox defined at the start of the WFS response
        else {
            return this.fetched.boundingBox;
        }
    }

    getSpatial(): Geometry | Geometries {
        let spatialContainer = this.select('./*/fis:SHAPE_25833/*', this.feature, true);
        if (!spatialContainer) {
            // use bounding box as fallback
            this.log.debug(`${this.uuid}: no geometry found, using bounding box instead`);
            return this.fetched.boundingBox;
        }
        let geojson = GeoJsonUtils.parse(spatialContainer, { crs: '25833' }, this.fetched.nsMap);
        return geojson;
    }

    getCentroid(): Point {
        let spatial = this.getSpatial() ?? this.getBoundingBox();
        return GeoJsonUtils.getCentroid(<Geometry | GeometryCollection>spatial);
    }

    getSpatialText(): string {
        return this.getTextContent('./*/fis:BEZIRK');
    }

    getPluDocType(code: string): PluDocType {
        switch (code) {
            default: return undefined;
        }
    }

    getPluPlanState(): PluPlanState {
        let planState = this.getTextContent('./*/fis:FESTSG');
        switch (planState?.toLowerCase()) {
            case 'ja': return PluPlanState.FESTGES;
            case 'nein': return PluPlanState.IN_AUFST;
            default: return PluPlanState.UNBEKANNT;
        }
    }

    // TODO make use of fis:PLANARTNAME
    getPluPlanType(): PluPlanType {
        let typename = this.getTypename();
        switch (typename) {
            case 'sach_bplan': return PluPlanType.BEBAU_PLAN;   // TODO check
            default: this.log.debug('No pluPlanType available for typename', typename); return PluPlanType.UNBEKANNT;
        }
    }

    getPluPlanTypeFine(): string {
        return undefined;
    }

    getPluProcedureState(): PluProcedureState {
        switch (this.getPluPlanState()) {
            case PluPlanState.FESTGES: return PluProcedureState.ABGESCHLOSSEN;
            case PluPlanState.IN_AUFST: return PluProcedureState.LAUFEND;
            default: return PluProcedureState.UNBEKANNT;
        }
    }

    getPluProcedureType(): PluProcedureType {
        return PluProcedureType.UNBEKANNT;
    }

    getPluProcessSteps(): ProcessStep[] {
        let processSteps: ProcessStep[] = [];
        // let period_aufstBeschl = getPeriod('./*/fis:AFS_BESCHL', './*/fis:AFS_L_AEND');
        // if (period_aufstBeschl) {
        //     processSteps.push({
        //         temporal: period_aufstBeschl,
        //         type: null  // TODO
        //     });
        // }
        // ignore these for now (meeting 2023-11-22)
        // let period_frzBuergerBet = this.getPeriod('./*/fis:BBG_ANFANG', './*/fis:BBG_ENDE');
        // if (period_frzBuergerBet) {
        //     processSteps.push({
        //         temporal: period_frzBuergerBet,
        //         type: PluProcessStepType.FRUEHZ_OEFFTL_BETEIL
        //     });
        // }
        // let period_oefftlAusleg = this.getPeriod('./*/fis:AUL_ANFANG', './*/fis:AUL_ENDE');
        // if (period_oefftlAusleg) {
        //     let link = this.getTextContent('./*/fis:AUSLEG_WWW');
        //     processSteps.push({
        //         ...link && { distributions: [{ accessURL: link }] },
        //         temporal: period_oefftlAusleg,
        //         type: PluProcessStepType.OEFFTL_AUSL
        //     });
        // }
        return processSteps;
    }

    getPluProcedureStartDate(): Date {
        let procedureStartDate = this.getTextContent('fis:AFS_BESCHL');
        return MiscUtils.normalizeDateTime(procedureStartDate);
    }

    getIssued(): Date {
        return undefined;
    }

    private getPeriod(startXpath: string, endXpath: string): DateRange {
        let period: DateRange;
        let start = this.getTextContent(startXpath);
        if (start) {
            period = { gte: MiscUtils.normalizeDateTime(start) };
        }
        let end = this.getTextContent(endXpath);
        if (end) {
            if (!start) {
                this.log.warn(`Skipping ProcessStep.temporal: An end date (${endXpath}) was specified but a start date (${startXpath}) is missing:`, this.uuid);
                return null;
            }
            else if (start > end) {
                this.log.warn(`Skipping ProcessStep.temporal: The start date (${start}) is later than the end date (${end}):`, this.uuid);
                return null;
            }
            period.lte = MiscUtils.normalizeDateTime(end);
        }
        return period;
    }
}
