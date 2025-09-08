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

import { PluDocType, PluPlanType, PluProcedureType } from '../../../../model/dcatApPlu.model';

/**
 * Structure:
 * xplanTypeName -> xplanCodelistValue -> [PluPlanType, PluPlanTypeFine]
 * 
 * This mapping is based on `Abgleich Codelistenwerte.xlsx`, and:
 * - https://xleitstelle.de/sites/default/files/objektartenkataloge/5_4/html/xplan_BP_Plan.html#xplan_BP_Plan_planArt
 * - https://xleitstelle.de/sites/default/files/objektartenkataloge/5_4/html/xplan_FP_Plan.html#xplan_FP_Plan_planArt
 * - https://xleitstelle.de/sites/default/files/objektartenkataloge/5_4/html/xplan_RP_Plan.html#xplan_RP_Plan_planArt
 *
 * Note especially that we use the XPlan 5.4 codelists for all XPlan documents!
 * 
 * The mappings (fine) targets are taken from the INSPIRE codelist for plan type name:
 * https://registry.gdi-de.org/codelist/de.xleitstelle.inspire_plu/PlanTypeNameValue
 */
export const PlanTypeMapping: { [key: string]: { [key: string]: [PluPlanType, string] } } = {
    bp_plan: {
        1000: [PluPlanType.BEBAU_PLAN, '6_Bebauungsplan'],
        10000: [PluPlanType.BEBAU_PLAN, '6_3_EinfacherBPlan'],
        10001: [PluPlanType.BEBAU_PLAN, '6_1_QualifizierterBPlan'],
        10002: [PluPlanType.BEBAU_PLAN, '6_6_BebauungsplanZurWohnraumversorgung'],
        3000: [PluPlanType.BEBAU_PLAN, '6_2_VorhabenbezogenerBPlan'],
        3100: [PluPlanType.BEBAU_PLAN, '6_5_VorhabenUndErschliessungsplan'],
        4000: [PluPlanType.STAEDT_BAUL_SATZ, '7_InnenbereichsSatzung'],
        40000: [PluPlanType.STAEDT_BAUL_SATZ, '7_1_KlarstellungsSatzung'],
        40001: [PluPlanType.STAEDT_BAUL_SATZ, '7_2_EntwicklungsSatzung'],
        40002: [PluPlanType.STAEDT_BAUL_SATZ, '7_3_ErgaenzungsSatzung'],
        5000: [PluPlanType.STAEDT_BAUL_SATZ, '8_AussenbereichsSatzung'],
        7000: [PluPlanType.PW_BES_STAEDT_BAUR, '9_2_SonstigesPlanwerkStaedtebaurecht'],
        9999: [PluPlanType.PW_BES_STAEDT_BAUR, '9_2_SonstigesPlanwerkStaedtebaurecht'],
        // default: [PluPlanType.UNBEKANNT, undefined]
    },
    fp_plan: {
        1000: [PluPlanType.FLAECHENN_PLAN, '5_2_FPlan'],
        2000: [PluPlanType.FLAECHENN_PLAN, '4_2_GemeinsamerFPlan'],
        3000: [PluPlanType.FLAECHENN_PLAN, '4_1_RegFPlan'],
        4000: [PluPlanType.FLAECHENN_PLAN, '5_1_FPlanRegPlan'],
        5000: [PluPlanType.FLAECHENN_PLAN, '5_3_SachlicherTeilplan'],
        9999: [PluPlanType.PW_BES_STAEDT_BAUR, '9_2_SonstigesPlanwerkStaedtebaurecht'],
        // default: [PluPlanType.UNBEKANNT, undefined]
    },
    lp_plan: {
        1000: [PluPlanType.RAUM_ORDN_PLAN, '2_4_Landschaftsprogramm'],
        2000: [PluPlanType.PW_LANDSCH_PLAN, '3_4_Landschaftsrahmenplan'],
        3000: [PluPlanType.PW_LANDSCH_PLAN, '5_4_Landschaftsplan'],
        4000: [PluPlanType.PW_LANDSCH_PLAN, '6_4_Gruenordnungsplan'],
        9999: [PluPlanType.PW_LANDSCH_PLAN, '9_3_SonstigesPlanwerkNaturschutzrecht'],
        // default: [PluPlanType.UNBEKANNT, undefined]
    },
    rp_plan: {
        1000: [PluPlanType.RAUM_ORDN_PLAN, '3_1_Regionalplan'],
        2000: [PluPlanType.RAUM_ORDN_PLAN, '3_3_SachlicherTeilplanRegionalebene'],
        2001: [PluPlanType.RAUM_ORDN_PLAN, '2_2_SachlicherTeilplanLandesebene'],
        3000: [PluPlanType.RAUM_ORDN_PLAN, '2_3_Braunkohlenplan'],
        4000: [PluPlanType.RAUM_ORDN_PLAN, '2_1_LandesweiterRaumordnungsplan'],
        5000: [PluPlanType.RAUM_ORDN_PLAN, '1_1_StandortkonzeptBund'],
        5001: [PluPlanType.RAUM_ORDN_PLAN, '1_2_AWZPlan'],
        6000: [PluPlanType.RAUM_ORDN_PLAN, '3_2_RaeumlicherTeilplan'],
        9999: [PluPlanType.RAUM_ORDN_PLAN, '9_1_SonstigerRaumordnungsplan'],
        // default: [PluPlanType.UNBEKANNT, undefined]
    },
    so_plan: {
        '01': [PluPlanType.PW_BES_STAEDT_BAUR, '9_4_ErhaltungssatzungVerordnungStaedtebaulicheGestalt'],
        '02': [PluPlanType.PW_BES_STAEDT_BAUR, '9_5_ErhaltungssatzungVerordnungWohnbevoelkerung'],
        '03': [PluPlanType.PW_BES_STAEDT_BAUR, '9_6_ErhaltungssatzungVerordnungUmstrukturierung'],
        '04': [PluPlanType.PW_BES_STAEDT_BAUR, '9_7_VerordnungGebietMitAngespanntemWohnungsmarkt'],
        // default: [PluPlanType.UNBEKANNT, undefined]
    }
};

export const ProcedureTypeMapping: { [key: string]: { [key: string]: PluProcedureType } } = {
    bp_plan: {
        1000: PluProcedureType.NORM_VERF,
        2000: PluProcedureType.VEREINF_VERF,
        3000: PluProcedureType.BEBAU_PLAN_INNEN,
        4000: PluProcedureType.EINBEZ_AUSSEN_BESCHLEU,
        // default: PluProcedureType.UNBEKANNT
    },
    fp_plan: {
        1000: PluProcedureType.NORM_VERF,
        2000: PluProcedureType.VEREINF_VERF,
        // default: PluProcedureType.UNBEKANNT
    },
    rp_plan: {
        1000: PluProcedureType.AEND,
        2000: PluProcedureType.TEIL_FORT,
        3000: PluProcedureType.NEU_AUFST,
        4000: PluProcedureType.GESAMT_FORT,
        5000: PluProcedureType.AKTUAL,
        6000: PluProcedureType.NEU_BEKANNT,
        // default: PluProcedureType.UNBEKANNT
    }
};

export const DocTypeMapping: {} = {
    // 1000: PluDocType., // Beschreibung
    // 1010: PluDocType., // Begründung
    // 1020: PluDocType., // Legende
    // 1030: PluDocType., // Rechtsplan
    // 1040: PluDocType., // Plangrundlage - Abbildung auf BackgroundMapValue (siehe Tabelle 17)
    // 1050: PluDocType., // Umweltbericht
    // 1060: PluDocType., // Satzung
    // 1065: PluDocType., // Verordnung
    // 1070: PluDocType., // Karte
    1080: PluDocType.ERLAEUT_BER, // Erläuterung
    // 1090: PluDocType., // Zusammenfassende Erklärung
    // 2000: PluDocType., // Koordinatenliste
    // 2100: PluDocType., // Grundstücksverzeichnis
    // 2200: PluDocType., // Pflanzliste
    // 2300: PluDocType., // Grünordnungsplan
    // 2400: PluDocType., // Erschließungsvertrag
    // 2500: PluDocType., // Durchführungsvertrag
    // 2600: PluDocType., // Städtebaulicher Vertrag
    // 2700: PluDocType., // Umweltbezogene Stellungnahmen
    // 2800: PluDocType., // Beschluss
    // 2900: PluDocType., // Vorhaben- und Erschliessungsplan
    // 3000: PluDocType., // Metadaten von Plan
    // 9998: PluDocType., // Rechtsverbindlich
    // 9999: PluDocType., // Informell
    // default: PluDocType.UNBEKANNT
};
