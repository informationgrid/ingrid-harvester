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

import { DiplanungUtils } from '../../../../profiles/diplanung/diplanung.utils';
import { Distribution} from '../../../../model/distribution';
import { MiscUtils } from '../../../../utils/misc.utils';
import { PluDocType } from '../../../../model/dcatApPlu.model';
import { XplanWfsMapper } from '../xplan.wfs.mapper';


const distributionTags = {
    'externeReferenz': null,
    'refBegruendung': 'Begründung',
    'refGruenordnungsplan': 'Grünordnungsplan',
    'refRechtsplan': 'Rechtsplan'
};

export class XplanSynWfsMapper extends XplanWfsMapper {

    /**
     * Handle syn-wfs specific format, e.g.:
     * <xplan:externeReferenz>[/getAttachment?featureID=XPLAN_SO_PLAN_c6b4ca1a-20fc-4fe6-8343-bd8236bf0c98&amp;filename=StErhVO_Birkenau.pdf | Verordnung]</xplan:externeReferenz>
     *
     * @returns 
     */
    async _getDistributions(): Promise<Distribution[]> {
        let distributions = [];
        Object.entries(distributionTags).forEach(([tagName, tagDescription]) => {
            distributions.push(...this.getSpecificDistributions(tagName, tagDescription));
        });
        // add xplan-specific WMS distributions
        let wmsDists = DiplanungUtils.generateXplanWmsDistributions(this._getCatalog().identifier, this._getTitle(), this._getPluPlanType());
        distributions.push(...wmsDists);
        return distributions;
    }

    private getSpecificDistributions(tagName: string, tagDescription: string): Distribution[] {
        let distributions = [];
        let externalReferences = this.select(`./*/xplan:${tagName}`, this.feature, true)?.textContent ?? '';
        let externalReferencesIt = externalReferences.matchAll(/\[(?<accessURL>.*?) \| (?<description>.*?)\]/g);
        for (let reference of externalReferencesIt) {
            let { accessURL, description } = reference.groups;
            let distribution: Distribution = {
                accessURL,
                description: tagDescription ?? description,
                pluDocType: this.parseToDoctype(description)
            };
            let format = MiscUtils.getFileExtension(accessURL);
            if (format) {
                distribution.format = [format];
            }
            if (MiscUtils.isMaybeDownloadUrl(accessURL)) {
                distribution.downloadURL = accessURL;
            }
            distributions.push(distribution);
        }
        return distributions;
    }

    private parseToDoctype(str: string): PluDocType {
        switch(str) {
            default : return PluDocType.UNBEKANNT
        }
    }

    _getAlternateTitle() {
        let alternateTitle = this.getTextContent('./*/xplan:xpPlanName')?.trim();
        return alternateTitle ?? undefined;
    }

    /**
     * Handle syn-wfs specific format, e.g.:
     * <xplan:gemeinde>[Gemeindeschlüssel: 02000000|Gemeinde: Freie und Hansestadt Hamburg|Ortsteil: 526]</xplan:gemeinde>
     * 
     * @returns
     */
    _getSpatialText(): string {
        let xpgemeinde = this.select('./*/xplan:gemeinde', this.feature, true)?.textContent;
        if (xpgemeinde) {
            let { ags, gemeinde, ortsteil } = xpgemeinde.match(/^\[Gemeindeschlüssel: (?<ags>.*?)\s?(?:\|\s?Gemeinde: (?<gemeinde>.*?))?\s?(?:\|\s?Ortsteil: (?<ortsteil>.*?))?\]$/)?.groups ?? {};
            if (ags) {
                // now it's getting dirty
                if (ags.length < 8) {
                    if (parseInt(ags.slice(0, 2)) > 16) {
                        ags = '0' + ags
                    }
                    ags = ags.padEnd(8, '0');
                }
                let rs;
                if (ortsteil?.match("^\\d{3}$")) {
                    rs = ags.substring(0, 2) + "\\d{3}0" + ortsteil + ortsteil;
                    if (this.findLegalRs(rs).length == 0) {
                        rs = ags.substring(0, 2) + "\\d{7}" + ortsteil;
                    }
                }
                else {
                    rs = ags.substring(0, 2) + "\\d{7}" + ags.substring(5, 8);
                }
                let existingRs = this.findLegalRs(rs);
                if (existingRs.length == 1) {
                    return existingRs[0];
                }
                else {
                    return ags;
                }
            }
            else {
                this.log.warn('Could not parse xpgemeinde into existing RS: ', xpgemeinde);
                return gemeinde;
            }
        }
    }
}
