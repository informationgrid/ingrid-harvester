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

import { Distribution} from '../../../model/distribution';
import { GeoJsonUtils } from '../../../utils/geojson.utils';
import { MiscUtils } from '../../../utils/misc.utils';
import { PluDocType, PluPlanType, PluProcedureState, PluProcedureType, ProcessStep } from '../../../model/dcatApPlu.model';
import { WfsMapper } from '../wfs.mapper';

export class XplanWfsMapper extends WfsMapper {

    _getDescription() {
        return this.getTextContent('./*/xplan:beschreibung');
    }

    async _getDistributions(): Promise<Distribution[]> {
        let distributions = [];
        for (let elem of this.select('./*/xplan:externeReferenz/xplan:XP_SpezExterneReferenz', this.feature)) {
            let distribution: Distribution = {
                accessURL: this.getTextContent('./xplan:referenzURL', elem),
                description: this.getTextContent('./xplan:art', elem),
                format: [this.getTextContent('./xplan:referenzMimeType', elem)],
                pluDocType: this._getPluDocType(this.getTextContent('./xplan:typ', elem))
            };
            distributions.push(distribution);
        }
        return distributions;
    }

    _getTitle() {
        let title = this.getTextContent('./*/xplan:name');
        return title && title.trim() !== '' ? title : undefined;
    }

    _getAlternateTitle() {
        return this._getTitle();
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
        else if (this.select('./*/xplan:raeumlicherGeltungsbereich', this.feature, true)) {
            return GeoJsonUtils.getBbox(this.getSpatial());
        }
        return undefined;
    }

    _getSpatial(): object {
        let spatialContainer = this.select('./*/xplan:raeumlicherGeltungsbereich/*', this.feature, true);
        if (!spatialContainer) {
            // use bounding box as fallback
            return this._getBoundingBox();
        }
        let crs = (<Element>spatialContainer).getAttribute('srsName');
        if (!crs) {
            crs = this.fetched.defaultCrs;
        }
        else if (!crs.startsWith('EPSG:')) {
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
    // TODO check
    _getSpatialText(): string {
        // find existing Regionalschluessel corresponding to the retrieved/constructed entry
        const findLegalRs = (rs) => {
            let r = new RegExp(rs);
            return this.fetched.regionalschluessel.filter(aRs => r.test(aRs));
        }

        let xpGemeinde = this.select('./*/xplan:gemeinde/xplan:XP_Gemeinde', this.feature, true);
        if (xpGemeinde) {
            let rs = this.getTextContent('./xplan:rs', xpGemeinde);
            if (!rs) {
                let ags = this.getTextContent('./xplan:ags', xpGemeinde);
                let gemeinde = this.getTextContent('./xplan:ortsteilName', xpGemeinde);
                if (ags) {
                    if (gemeinde && gemeinde.match("^\\d{3}$")) {
                        rs = ags.substring(0, 2) + "\\d{3}0" + gemeinde + gemeinde;
                        if (findLegalRs(rs).length == 0) {
                            rs = ags.substring(0, 2) + "\\d{7}" + gemeinde;
                        }
                    }
                    else {
                        rs = ags.substring(0, 2) + "\\d{7}" + ags.substring(5, 8);
                    }
                }
            }
            let existingRs = findLegalRs(rs);
            if (existingRs.length == 1) {
                return existingRs[0];
            }
        }
        return undefined;
    }

    // TODO fill in the gaps
    _getPluDocType(code: string): PluDocType {
        switch (code) {
            // case '1000': return pluDocType.;// Beschreibung
            // case '1010': return pluDocType.;// Begründung
            // case '1020': return pluDocType.;// Legende
            // case '1030': return pluDocType.;// Rechtsplan
            // case '1040': return pluDocType.;// Plangrundlage - Abbildung auf BackgroundMapValue (siehe Tabelle 17)
            // case '1050': return pluDocType.;// Umweltbericht
            // case '1060': return pluDocType.;// Satzung
            // case '1065': return pluDocType.;// Verordnung
            // case '1070': return pluDocType.;// Karte
            case '1080': return PluDocType.ERLAEUT_BER; // Erläuterung
            // case '1090': return pluDocType.;// Zusammenfassende Erklärung
            // case '2000': return pluDocType.;// Koordinatenliste
            // case '2100': return pluDocType.;// Grundstücksverzeichnis
            // case '2200': return pluDocType.;// Pflanzliste
            // case '2300': return pluDocType.;// Grünordnungsplan
            // case '2400': return pluDocType.;// Erschließungsvertrag
            // case '2500': return pluDocType.;// Durchführungsvertrag
            // case '2600': return pluDocType.;// Städtebaulicher Vertrag
            // case '2700': return pluDocType.;// Umweltbezogene Stellungnahmen
            // case '2800': return pluDocType.;// Beschluss
            // case '2900': return pluDocType.;// Vorhaben- und Erschliessungsplan
            // case '3000': return pluDocType.;// Metadaten von Plan
            // case '9998': return pluDocType.;// Rechtsverbindlich
            // case '9999': return pluDocType.;// Informell
            default: return PluDocType.UNBEKANNT;
        }
    }

    // TODO fill in the gaps
    _getPluPlanType(): PluPlanType {
        let typename = this.getTypename();
        let planart = this.getTextContent('./*/xplan:planArt');
        switch (typename) {
            case 'BP_Plan':
                switch (planart) {
                    case '7000': return PluPlanType.PW_BES_STAEDT_BAUR;
                    case '9999': return PluPlanType.PW_BES_STAEDT_BAUR;
                    default: return PluPlanType.BEBAU_PLAN;
                }
            case 'FP_Plan':
                switch (planart) {
                    case '9999': return PluPlanType.PW_BES_STAEDT_BAUR;
                    default: return PluPlanType.FLAECHENN_PLAN;
                }
            case 'RP_Plan':
                switch (planart) {
                    default: return PluPlanType.RAUM_ORDN_PLAN;
                }
            case 'SO_Plan':
                switch (planart) {
                    case '01': return PluPlanType.PW_BES_STAEDT_BAUR;
                    case '02': return PluPlanType.PW_BES_STAEDT_BAUR;
                    case '03': return PluPlanType.PW_BES_STAEDT_BAUR;
                    case '04': return PluPlanType.PW_BES_STAEDT_BAUR;
                    default: return PluPlanType.SONST_PLAN;
                }
            case 'LP_PLAN':
                switch (planart) {
                    // TODO case '1000' is from the sheet 'Abgleich Codelistenwerte.xlsx', but is it correct?
                    case '1000': return PluPlanType.RAUM_ORDN_PLAN;
                    // case '1000': return PluPlanType.PW_LANDSCH_PLAN;
                    case '2000': return PluPlanType.PW_LANDSCH_PLAN;
                    case '4000': return PluPlanType.PW_LANDSCH_PLAN;
                    case '9999': return PluPlanType.PW_LANDSCH_PLAN;
                    default: this.log.debug('No PluPlanType available for typename', typename); return PluPlanType.UNBEKANNT;
                }
            default: this.log.debug('No PluPlanType available for typename', typename); return PluPlanType.UNBEKANNT;
        }
    }

    /**
     * This mapping is based on:
     * - https://xleitstelle.de/sites/default/files/objektartenkataloge/5_4/html/xplan_BP_Plan.html#xplan_BP_Plan_planArt
     * - https://xleitstelle.de/sites/default/files/objektartenkataloge/5_4/html/xplan_FP_Plan.html#xplan_FP_Plan_planArt
     * - https://xleitstelle.de/sites/default/files/objektartenkataloge/5_4/html/xplan_RP_Plan.html#xplan_RP_Plan_planArt
     *
     * and on 'Abgleich Codelistenwerte.xlsx'.
     * 
     * Note especially that we use the XPlan 5.4 codelists for all XPlan documents!
     * 
     * The mappings targets are taken from the INSPIRE codelist for plan type name:
     * https://registry.gdi-de.org/codelist/de.xleitstelle.inspire_plu/PlanTypeNameValue
     * 
     * // TODO fill in the gaps
     * // TODO what about other WFS sources?
     * // TODO check differently versioned codelists for discrepancies
     * 
     * @returns 
     */
    _getPluPlanTypeFine(): string {
        let typename = this.getTypename();
        let planart = this.getTextContent('./*/xplan:planArt');
        switch (typename) {
            case 'BP_Plan':
                switch(planart) {
                    case '1000': return '6_Bebauungsplan';    // BPlan
                    case '10000': return '6_3_EinfacherBPlan';    // EinfacherBPlan
                    case '10001': return '6_1_QualifizierterBPlan';   // QualifizierterBPlan
                    case '10002': return '6_6_BebauungsplanZurWohnraumversorgung';    // BebauungsplanZurWohnraumversorgung
                    case '3000': return '6_2_VorhabenbezogenerBPlan'; // VorhabenbezogenerBPlan
                    case '3100': return '6_5_VorhabenUndErschliessungsplan'; // VorhabenUndErschliessungsplan
                    case '4000': return '7_InnenbereichsSatzung';     // InnenbereichsSatzung
                    case '40000': return '7_1_KlarstellungsSatzung';  // KlarstellungsSatzung
                    case '40001': return '7_2_EntwicklungsSatzung';   // EntwicklungsSatzung
                    case '40002': return '7_3_ErgaenzungsSatzung';    // ErgaenzungsSatzung
                    case '5000': return '8_AussenbereichsSatzung';    // AussenbereichsSatzung
                    case '7000': return '9_2_SonstigesPlanwerkStaedtebaurecht'; // OertlicheBauvorschrift
                    case '9999': return '9_2_SonstigesPlanwerkStaedtebaurecht'; // Sonstiges
                    default: this.log.debug('No planTypeFine available for xplan:planArt', planart);
                }
            case 'FP_Plan':
                switch(planart) {
                    case '1000': return '5_2_FPlan';  // FPlan
                    case '2000': return '4_2_GemeinsamerFPlan';   // GemeinsamerFPlan
                    case '3000': return '4_1_RegFPlan';   // RegFPlan
                    case '4000': return '5_1_FPlanRegPlan';   // FPlanRegPlan
                    case '5000': return '5_3_SachlicherTeilplan'; // SachlicherTeilplan
                    case '9999': return '9_2_SonstigesPlanwerkStaedtebaurecht'; // Sonstiges
                    default: this.log.debug('No planTypeFine available for xplan:planArt', planart);
                }
            case 'RP_Plan':
                switch(planart) {
                    case '1000': return '3_1_Regionalplan';   // Regionalplan
                    case '2000': return '3_3_SachlicherTeilplanRegionalebene';   // SachlicherTeilplanRegionalebene
                    case '2001': return '2_2_SachlicherTeilplanLandesebene';  // SachlicherTeilplanLandesebene
                    case '3000': return '2_3_Braunkohlenplan';    // Braunkohlenplan
                    case '4000': return '2_1_LandesweiterRaumordnungsplan';   // LandesweiterRaumordnungsplan
                    case '5000': return '1_1_StandortkonzeptBund';    // StandortkonzeptBund
                    case '5001': return '1_2_AWZPlan';    // AWZPlan
                    case '6000': return '3_2_RaeumlicherTeilplan';    // RaeumlicherTeilplan
                    case '9999': return '9_1_SonstigerRaumordnungsplan'; // Sonstiges
                    default: this.log.debug('No planTypeFine available for xplan:planArt', planart);
                }
            case 'SO_Plan':
                // TODO no codelists found!
                // codeSpace="www.mysynergis.com/XPlanungR/5.1/0"; but URL (or similar) does not exist
                switch(planart) {
                    // TODO possibly more values possible; these are the ones found in the data so far
                    // case 2000: return pluPlanTypeFine.;
                    // case 17200: return pluPlanTypeFine.;
                    case '01': return '9_4_ErhaltungssatzungVerordnungStaedtebaulicheGestalt';
                    case '02': return '9_5_ErhaltungssatzungVerordnungWohnbevoelkerung';
                    case '03': return '9_6_ErhaltungssatzungVerordnungUmstrukturierung';
                    case '04': return '9_7_VerordnungGebietMitAngespanntemWohnungsmarkt';
                    default: this.log.debug('No planTypeFine available for xplan:planArt', planart);
                }
        }
        return undefined;
    }

    _getPluProcedureState(): PluProcedureState {
        return super._getPluProcedureState();
    }

    /**
     * This is currently XPlan specific.
     * 
     * // TODO more process steps?
     * // TODO what about other WFS sources?
     */
    _getPluProcedureType(): PluProcedureType {
        let typename = this.getTypename();
        let procedureType = this.getTextContent('./*/xplan:verfahren');
        switch (typename) {
            case 'BP_Plan': 
                switch (procedureType) {
                    case '1000': return PluProcedureType.NORM_VERF;                 // Normal
                    case '2000': return PluProcedureType.VEREINF_VERF;              // Parag13
                    case '3000': return PluProcedureType.BEBAU_PLAN_INNEN;          // Parag13a
                    case '4000': return PluProcedureType.EINBEZ_AUSSEN_BESCHLEU;    // Parag13b
                    default: this.log.debug('No procedure type available for xplan:verfahren', procedureType);
                }
            case 'FP_Plan':
                switch (procedureType) {
                    case '1000': return PluProcedureType.NORM_VERF;     // Normal
                    case '2000': return PluProcedureType.VEREINF_VERF;  // Parag13
                    default: this.log.debug('No procedure type available for xplan:verfahren', procedureType);
                }
            case 'RP_Plan':
                switch (procedureType) {
                    case '1000': return PluProcedureType.AEND;          // Änderung
                    case '2000': return PluProcedureType.TEIL_FORT;     // Teilfortschreibung
                    case '3000': return PluProcedureType.NEU_AUFST;     // Neuaufstellung
                    case '4000': return PluProcedureType.GESAMT_FORT;   // Gesamtfortschreibung
                    case '5000': return PluProcedureType.AKTUAL;        // Aktualisierung
                    case '6000': return PluProcedureType.NEU_BEKANNT;   // Neubekanntmachung
                    default: this.log.debug('No procedure type available for xplan:verfahren', procedureType);
                }
        }
        return PluProcedureType.UNBEKANNT;
    }

    // TODO
    _getPluProcessSteps(): ProcessStep[] {
        return undefined;
    }

    _getPluProcedureStartDate(): Date {
        let procedureStartDate = this.getTextContent('./*/xplan:aufstellungsbeschlussDatum');
        return MiscUtils.normalizeDateTime(procedureStartDate);
    }

    _getIssued(): Date {
        let issued = this.getTextContent('./*/xplan:technHerstellDatum');
        return MiscUtils.normalizeDateTime(issued);
    }

    _getMetadataHarvested(): Date {
        return new Date(Date.now());
    }
}
