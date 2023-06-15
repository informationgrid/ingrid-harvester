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

import { pluPlanState, pluPlanType, pluProcedureState, pluProcedureType, pluProcessStepType, ProcessStep } from '../../../model/dcatApPlu.model';
import { AllGeoJSON } from '@turf/helpers';
import { DateRange } from '../../../model/dateRange';
import { Distribution } from '../../../model/distribution';
import { GeoJsonUtils } from '../../../utils/geojson.utils';
import { MiscUtils } from '../../../utils/misc.utils';
import { WfsMapper } from '../wfs.mapper';

export class FisWfsMapper extends WfsMapper {

    _getDescription() {
        return this.getTextContent('./*/fis:BEREICH');
    }

    async _getDistributions(): Promise<Distribution[]> {
        let distributions = [];
        for (let elem of this.select('./*/fis:*[local-name()="SCAN_WWW" or local-name()="GRUND_WWW"]', this.feature)) {
            let distribution: Distribution = { accessURL: elem.textContent };
            if (isMaybeDownloadUrl(distribution.accessURL)) {
                distribution.downloadURL = distribution.accessURL;
            }
            distributions.push(distribution);
        }
        return distributions;
    }

    _getTitle() {
        let title = this.getTextContent('./*/fis:PLANNAME');
        return title && title.trim() !== '' ? title : undefined;
    }

    _getAlternateTitle() {
        return this._getTitle();
    }

    _getBoundingBox(): object {
        // if spatial exists, create bbox from it
        if (this.select('./*/fis:SHAPE_25833', this.feature, true)) {
            return GeoJsonUtils.getBbox(this.getSpatial());
        }
        // otherwise, use the bbox defined at the start of the WFS response
        else {
            return this.fetched.boundingBox;
        }
    }

    _getSpatial(): object {
        // let spatialContainer = this.select('./*/fis:SHAPE_25833', this.feature, true);
        // if (!spatialContainer) {
        //     // use bounding box as fallback
        //     return this.fetched.boundingBox;
        // }
        // let child = XPathUtils.firstElementChild(spatialContainer);
        // if (child == null) {
        //     return undefined;
        // }
        let spatialContainer = this.select('./*/fis:SHAPE_25833/*', this.feature, true);
        if (!spatialContainer) {
            // use bounding box as fallback
            this.log.debug(`${this.uuid}: no geometry found, using bounding box instead`);
            return this.fetched.boundingBox;
        }
        let geojson = this.fetched.geojsonUtils.parse(spatialContainer, { crs: 'EPSG:25833' });
        return geojson;
    }

    _getCentroid(): object {
        let spatial = this._getSpatial() ?? this._getBoundingBox();
        return GeoJsonUtils.getCentroid(<AllGeoJSON>spatial)?.geometry;
    }

    _getSpatialText(): string {
        return this.getTextContent('./*/fis:BEZIRK');
    }

    _getCatalog() {
        return this.fetched.catalog;
    }

    _getPluDevelopmentFreezePeriod() {
        return undefined;
    }

    _getPluDocType(code: string): string {
        switch (code) {
            default: return undefined;
        }
    }

    _getPluPlanState(): string {
        let planState = this.getTextContent('./*/fis:FESTSG');
        switch (planState?.toLowerCase()) {
            case 'ja': return pluPlanState.FESTGES;
            case 'nein': return pluPlanState.IN_AUFST;
            default: return pluPlanState.UNBEKANNT;
        }
    }

    // TODO make use of fis:PLANARTNAME
    _getPluPlanType(): string {
        let typename = this.getTypename();
        switch (typename) {
            case 'sach_bplan': return pluPlanType.BEBAU_PLAN;   // TODO check
            default: this.log.debug('No pluPlanType available for typename', typename); return pluPlanType.UNBEKANNT;
        }
    }

    _getPluPlanTypeFine(): string {
        return undefined;
    }

    _getPluProcedureState(): string {
        let planState = super._getPluPlanState();
        if (planState) {
            return planState;
        }
        switch (this._getPluPlanState()) {
            case pluPlanState.FESTGES: return pluProcedureState.ABGESCHLOSSEN;
            case pluPlanState.IN_AUFST: return pluProcedureState.LAUFEND;
            default: return pluProcedureState.UNBEKANNT;
        }
    }

    _getPluProcedureType(): string {
        return pluProcedureType.UNBEKANNT;
    }

    _getPluProcessSteps(): ProcessStep[] {
        let processSteps = [];
        // let period_aufstBeschl = getPeriod('./*/fis:AFS_BESCHL', './*/fis:AFS_L_AEND');
        // if (period_aufstBeschl) {
        //     processSteps.push({
        //         period: period_aufstBeschl,
        //         type: null  // TODO
        //     });
        // }
        let period_frzBuergerBet = this.getPeriod('./*/fis:BBG_ANFANG', './*/fis:BBG_ENDE');
        if (period_frzBuergerBet) {
            processSteps.push({
                period: period_frzBuergerBet,
                type: pluProcessStepType.FRUEHZ_OEFFTL_BETEIL
            });
        }
        let period_oefftlAusleg = this.getPeriod('./*/fis:AUL_ANFANG', './*/fis:AUL_ENDE');
        if (period_oefftlAusleg) {
            let link = this.getTextContent('./*/fis:AUSLEG_WWW');
            processSteps.push({
                ...link && { distributions: [{ accessURL: link }] },
                period: period_oefftlAusleg,
                type: pluProcessStepType.OEFFTL_AUSL
            });
        }
        return processSteps;
    }

    _getPluProcedureStartDate(): Date {
        let procedureStartDate = this.getTextContent('fis:AFS_BESCHL');
        return MiscUtils.normalizeDateTime(procedureStartDate);
    }

    _getIssued(): Date {
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
                this.log.warn(`Skipping ProcessStep.period: An end date (${endXpath}) was specified but a start date (${startXpath}) is missing:`, this.uuid);
                return null;
            }
            else if (start > end) {
                this.log.warn(`Skipping ProcessStep.period: The start date (${start}) is later than the end date (${end}):`, this.uuid);
                return null;
            }
            period.lte = MiscUtils.normalizeDateTime(end);
        }
        return period;
    }
}

// very simple heuristic
// TODO expand/improve
function isMaybeDownloadUrl(url: string) {
    let ext = url.slice(url.lastIndexOf('.') + 1).toLowerCase();
    return ['jpeg', 'jpg', 'pdf', 'zip'].includes(ext) || url.toLowerCase().indexOf('service=wfs') > -1;
}
