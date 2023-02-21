/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {GenericMapper } from "../importer/generic.mapper";
import {Agent, Contact, Organization, Person} from "./agent";
import {Distribution} from "./distribution";
import {DateRange} from "./dateRange";

export interface Catalog {
    description: string,
    homepage?: string,
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
    period?: DateRange,
    type: typeof pluProcessStepType[keyof typeof pluProcessStepType];
}

export interface Record {
    issued?: string,
    modified?: string,
    primaryTopic: string,
    title: string
}

/**
 * Codeliste Arten von Verfahren zur Aufstellung raumbezogener Planwerke (5.1)
 */
export const pluProcedureType = {
    NORM_VERF: '1001',          // normales Verfahren
    VEREINF_VERF: '1002', 	    // vereinfachtes Verfahren
    BEBAU_PLAN_INNEN: '1003',	// Bebauungsplan der Innenentwicklung
    UNBEKANNT: '1004'           // unbekannt
};

/**
 * Codeliste für übergeordneten Status eines Verfahrens (5.2)
 */
export const pluProcedureState = {
    GEPLANT: '2001',        // geplant
    LAUFEND: '2002',        // laufend
    ABGESCHLOSSEN: '2003',  // abgeschlossen
    UNBEKANNT: '2004'       // unbekannt
};

/**
 * Codeliste für Status eines Plans (5.3)
 */
export const pluPlanState = {
    IN_AUFST: '3001',   // in Aufstellung
    FESTGES: '3002',    // festgesetzt
    UNBEKANNT: '3004'   // unbekannt
};

/**
 * Codeliste für Arten von raumbezogenen Planwerken (5.4)
 */
export const pluPlanType = {
    BEBAU_PLAN: '1000',         // Bebauungsplan
    FLAECHENN_PLAN: '2000',     // Flächennutzungsplan
    STAEDT_BAUL_SATZ: '3000',   // städtebauliche Satzungen
    PW_BES_STAEDT_BAUR: '4000', // Planwerke besonderes Städtebaurecht
    PW_LANDSCH_PLAN: '5000',    // Planwerke der Landschaftsplanung
    RAUM_ORDN_PLAN: '6000',     // Raumordnungsplan
    RAUM_ORDN_VERF: '7000',     // Raumordnungsverfahren
    PLAN_FESTST_VERF: '8000',   // Planfeststellungsverfahren
    SONST_PLAN: '8500',         // Sonstige raumbezogene Planwerke
    UNBEKANNT: '9000'           // unbekannt
};

/**
 * Codeliste für Arten von Verfahrensschritten bei raumbezogenen Verfahren (5.5)
 */
export const pluProcessStepType = {
    FRUEHZ_BEH_BETEIL: '3001',   	// Frühzeitige Behördenbeteiligung
    FRUEHZ_OEFFTL_BETEIL: '3002', 	// Frühzeitige Öffentlichkeitsbeteiligung
    BETEIL_OEFFTL_TRAEGER: '3003', 	// Beteiligung der Träger öffentlicher Belange
    OEFFTL_AUSL: '3004', 	        // Öffentliche Auslegung
    INTERN_BEARB: '3005', 	        // Interne Bearbeitung
    ABGESCHLOSSEN: '3006'           // Abgeschlossen
};

/**
 * Codeliste für Arten von Dokumenten (5.6)
 */
export const pluDocType = {
    AUSLEG_INFO: '4001',    // Auslegungsinformationen
    ERLAEUT_BER: '4002', 	// Erläuterungsbericht
    PLAN_ZEICHN: '4003',	// Planzeichnung
    // TODO not finalized yet
};
