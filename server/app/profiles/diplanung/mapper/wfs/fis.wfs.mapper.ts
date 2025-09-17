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
import type { Distribution } from '../../../../model/distribution.js';
import type { Geometry, Point } from 'geojson';
import type { PluDocType, ProcessStep } from '../../../../model/dcatApPlu.model.js';
import { PluPlanState, PluPlanType, PluProcedureState, PluProcedureType } from '../../../../model/dcatApPlu.model.js';

export class FisWfsMapper extends DiplanungWfsMapper {

    getDescription(): string {
        return this.baseMapper.getTextContent('./*/fis:BEREICH');
    }

    async getDistributions(): Promise<Distribution[]> {
        let distributions = [];
        for (let elem of this.baseMapper.select('./*/fis:*[local-name()="SCAN_WWW" or local-name()="GRUND_WWW"]', this.baseMapper.featureOrFeatureType)) {
            let distribution: Distribution = { accessURL: elem.textContent };
            if (MiscUtils.isMaybeDownloadUrl(distribution.accessURL)) {
                distribution.downloadURL = distribution.accessURL;
            }
            distributions.push(distribution);
        }
        return distributions;
    }

    getTitle(): string {
        let title = this.baseMapper.getTextContent('./*/fis:PLANNAME')?.trim();
        return title ?? undefined;
    }

    getPluPlanName(): string {
        return this.getTitle();
    }

    getBoundingBox(): Geometry {
        // if spatial exists, create bbox from it
        if (this.baseMapper.select('./*/fis:SHAPE_25833', this.baseMapper.featureOrFeatureType, true)) {
            return GeoJsonUtils.getBbox(this.getSpatial());
        }
        // otherwise, use the general bbox defined at the start of the WFS response
        else {
            return this.baseMapper.fetched.boundingBox;
        }
    }

    getSpatial(): Geometry {
        let spatialContainer = this.baseMapper.select('./*/fis:SHAPE_25833/*', this.baseMapper.featureOrFeatureType, true);
        if (!spatialContainer) {
            // use bounding box as fallback
            this.baseMapper.log.debug(`${this.baseMapper.uuid}: no geometry found, using bounding box instead`);
            return this.baseMapper.fetched.boundingBox;
        }
        let geojson = GeoJsonUtils.parse(spatialContainer, { crs: '25833' }, this.baseMapper.fetched.nsMap);
        return geojson;
    }

    getCentroid(): Point {
        let spatial = this.getSpatial() ?? this.getBoundingBox();
        return GeoJsonUtils.getCentroid(<Geometry>spatial);
    }

    getSpatialText(): string {
        return this.baseMapper.getTextContent('./*/fis:BEZIRK');
    }

    getPluDocType(code: string): PluDocType {
        switch (code) {
            default: return undefined;
        }
    }

    getPluPlanState(): PluPlanState {
        let planState = this.baseMapper.getTextContent('./*/fis:FESTSG');
        switch (planState?.toLowerCase()) {
            case 'ja': return PluPlanState.FESTGES;
            case 'nein': return PluPlanState.IN_AUFST;
            default: return PluPlanState.UNBEKANNT;
        }
    }

    // TODO make use of fis:PLANARTNAME
    getPluPlanType(): PluPlanType {
        let typename = this.baseMapper.getTypename();
        switch (typename) {
            case 'sach_bplan': return PluPlanType.BEBAU_PLAN;   // TODO check
            default: this.baseMapper.log.debug('No pluPlanType available for typename', typename); return PluPlanType.UNBEKANNT;
        }
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

    getPluProcedurePeriod(): DateRange {
        let procedureStartDate = this.baseMapper.getTextContent('fis:AFS_BESCHL');
        return { gte: MiscUtils.normalizeDateTime(procedureStartDate) };
    }

    private getPeriod(startXpath: string, endXpath: string): DateRange {
        let period: DateRange;
        let start = this.baseMapper.getTextContent(startXpath);
        if (start) {
            period = { gte: MiscUtils.normalizeDateTime(start) };
        }
        let end = this.baseMapper.getTextContent(endXpath);
        if (end) {
            if (!start) {
                this.baseMapper.log.warn(`Skipping ProcessStep.temporal: An end date (${endXpath}) was specified but a start date (${startXpath}) is missing:`, this.baseMapper.uuid);
                return null;
            }
            else if (start > end) {
                this.baseMapper.log.warn(`Skipping ProcessStep.temporal: The start date (${start}) is later than the end date (${end}):`, this.baseMapper.uuid);
                return null;
            }
            period.lte = MiscUtils.normalizeDateTime(end);
        }
        return period;
    }
}
