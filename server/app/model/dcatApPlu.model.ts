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

import { DateRange } from './dateRange';
import { Distribution } from './distribution';
import { Organization, Person } from './agent';

export interface Catalog {
    description: string,
    homepage?: string,
    id?: number,
    identifier?: string,
    issued?: string,
    language?: string,
    modified?: string,
    publisher: Person | Organization,
    records?: Record[],
    themeTaxonomy?: string,
    title: string
}

export interface ProcessStep {
    distributions?: Distribution[],
    identifier?: string,
    passNumber?: number,
    temporal?: DateRange,
    type: PluProcessStepType
}

export interface Record {
    issued?: Date,
    modified?: Date,
    primaryTopic: string,
    title: string
}

/**
 * Codeliste Arten von Verfahren zur Aufstellung raumbezogener Planwerke (5.1)
 */
export enum PluProcedureType {
    NORM_VERF = 'regular',                  // normales Verfahren
    VEREINF_VERF = 'simplified', 	        // vereinfachtes Verfahren
    BEBAU_PLAN_INNEN = 'innerDevPlan',	    // Bebauungsplan der Innenentwicklung
    EINBEZ_AUSSEN_BESCHLEU = 'outdoorArea',	// Einbeziehung von Außenbereichsflächen in das beschleunigte Verfahren
    AEND = 'revision',                      // Änderung
    TEIL_FORT = 'partialExtrapolation',     // Teilfortschreibung
    NEU_AUFST = 'newPreparation',           // Neuaufstellung
    GESAMT_FORT = 'completeExtrapolation',  // Gesamtfortschreibung
    AKTUAL = 'update',                      // Aktualisierung
    NEU_BEKANNT = 'newAnnouncement',        // Neubekanntmachung
    UNBEKANNT = 'unknown'
}

/**
 * Codeliste für übergeordneten Status eines Verfahrens (5.2)
 */
export enum PluProcedureState {
    GEPLANT = 'planned',            // geplant
    LAUFEND = 'ongoing',            // laufend
    ABGESCHLOSSEN = 'completed',    // abgeschlossen
    UNBEKANNT = 'unknown'
}

/**
 * Codeliste für Status eines Plans (5.3)
 */
export enum PluPlanState {
    IN_AUFST = 'inPreparation', // in Aufstellung
    FESTGES = 'fixed',          // festgestellt
    UNBEKANNT = 'unknown'
}

/**
 * Codeliste für Arten von raumbezogenen Planwerken (5.4)
 */
export enum PluPlanType {
    BEBAU_PLAN = 'developmentPlan',                 // Bebauungsplan
    FLAECHENN_PLAN = 'landUsePlan',                 // Flächennutzungsplan
    STAEDT_BAUL_SATZ = 'urbanPlanningStatutes',     // städtebauliche Satzungen
    PW_BES_STAEDT_BAUR = 'specialUrbanPlanningLaw', // Planwerke besonderes Städtebaurecht
    PW_LANDSCH_PLAN = 'landscapePlanning',          // Planwerke der Landschaftsplanung
    RAUM_ORDN_PLAN = 'spatialPlan',                 // Raumordnungsplan
    RAUM_ORDN_VERF = 'spatialPlanningProcedure',    // Raumordnungsverfahren
    PLAN_FESTST_VERF = 'planApprovalProcedure',     // Planfeststellungsverfahren
    SONST_PLAN = 'other',                           // Sonstige raumbezogene Planwerke
    UNBEKANNT = 'unknown'
}

/**
 * Codeliste für Arten von Verfahrensschritten bei raumbezogenen Verfahren (5.5)
 */
export enum PluProcessStepType {
    FRUEHZ_BEH_BETEIL = 'earlyInvolveAuth',     // Frühzeitige Behördenbeteiligung
    FRUEHZ_OEFFTL_BETEIL = 'earlyPublicPart', 	// Frühzeitige Öffentlichkeitsbeteiligung
    BETEIL_OEFFTL_TRAEGER = 'publicAgencies',   // Beteiligung der Träger öffentlicher Belange
    OEFFTL_AUSL = 'publicDisclosure', 	        // Öffentliche Auslegung
    INTERN_BEARB = 'internal', 	                // Interne Bearbeitung
    ABGESCHLOSSEN = 'completed',                // Abgeschlossen
    UNBEKANNT = 'unknown'
}

/**
 * Codeliste für Arten von Dokumenten (5.6)
 */
export enum PluDocType {
    AUSLEG_INFO = 'announcement',       // Auslegungsinformationen
    ERLAEUT_BER = 'explanatoryReport', 	// Erläuterungsbericht
    PLAN_ZEICHN = 'planDrawing',	    // Planzeichnung
    UNBEKANNT = 'unknown'
    // TODO not finalized yet
}
