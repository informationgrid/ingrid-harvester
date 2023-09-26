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

import { Distribution } from '../../model/distribution';
import { PluPlanType } from '../../model/dcatApPlu.model';

export class DiplanungUtils {

    static generateXplanWmsDistribution(stateAbbrev: string, planName: string, planType: PluPlanType): Distribution {
        let wmsURL = `https://${stateAbbrev}.xplanungsplattform.de/xplan-wms/services/planwerkwms/planname/${encodeURIComponent(planName)}`;
        let mapLayerNames: string[];
        switch (planType) {
            case PluPlanType.BEBAU_PLAN:
                mapLayerNames = ['BP_Planvektor', 'BP_Planraster'];
                break;
            case PluPlanType.FLAECHENN_PLAN:
                mapLayerNames = ['FP_Planvektor', 'FP_Planraster'];
                break;
            // case PluPlanType.REGIONAL_PLAN:
            //     mapLayerNames = ['RP_Planvektor', 'RP_Planraster'];
            //     break;
        }
        let wmsPlanwerk: Distribution = {
            accessURL: wmsURL,
            format: ['WMS'],
            title: planName + ' WMS',
            mapLayerNames
        };
        return wmsPlanwerk;
    }

    static generatePlanDigitalWmsDistribution(planName: string, stelleId: string): Distribution {
        let wmsURL = `https://testportal-plandigital.de/ows/${stelleId}/fplan`;
        let mapLayerNames = ['fp_plan'];
        let wmsPlanwerk: Distribution = {
            accessURL: wmsURL,
            format: ['WMS'],
            title: planName + ' WMS',
            mapLayerNames
        };
        return wmsPlanwerk;
    }
}
