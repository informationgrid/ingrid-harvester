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

import type { ImporterCapabilities, ImporterSettings } from '../importer.settings.js';
import { defaultImporterSettings } from '../importer.settings.js';
import type { Contact, Organization, Person } from '../../model/agent.js';
import type { PluPlanState } from '../../model/dcatApPlu.model.js';

export type WfsSettings = {
    version: '2.0.0' | '1.1.0',       // WFS protocol version used for requests; UI-configurable
    memberElements: string[],           // XPath expressions to locate feature elements in WFS response; backend-only (set per profile)
    pluPlanState?: PluPlanState,        // planning status assigned to harvested records; UI-configurable (DiPlanung profile only)
    contactCswUrl?: string,             // CSW URL to fetch contact metadata for all features; UI-configurable (DiPlanung profile only)
    contactMetadata?: Contact,          // fallback contact when CSW lookup yields no result; UI-configurable (DiPlanung profile only)
    maintainer?: Person | Organization; // fallback maintainer when CSW lookup yields no custodian; UI-configurable (DiPlanung profile only)
    count: number,                      // Deprecated? intended as paging count; not used in importer (maxRecords is used instead); backend-only
    resultType?: 'hits' | 'results',   // WFS request result mode; 'hits' = count only; set programmatically; backend-only
    typename?: string,                  // comma-separated WFS feature type names (with namespace prefix) to harvest; UI-configurable
    featureLimit: number,               // max features harvested per type before stopping (0 = unlimited); UI-configurable
    harvestTypes: boolean,              // if true, also harvest FeatureType metadata in addition to features; backend-only
    httpMethod: 'GET' | 'POST',         // HTTP method for WFS requests; UI-configurable
    featureFilter?: string,             // OGC Filter XML to constrain feature results; backend-only
    resolveWithFullResponse?: boolean,  // return full HTTP response object for GetCapabilities; backend-only
    requireGeometry?: boolean,          // skip feature types that have no geometry; backend-only
    wfsProfile: WfsProfile,             // selects member element defaults and profile-specific behaviour; UI-configurable
    featureTitleAttribute?: string,     // XPath expression for extracting feature title (ingrid profile); UI-configurable
} & ImporterSettings;

export enum WfsProfile {
    // TODO diplanung profiles
    default = "default",
    pegelonline = "pegelonline",
    zdm = "zdm"
}

export const wfsDefaults: WfsSettings = {
    ...defaultImporterSettings,
    version: '2.0.0',
    memberElements: ["gml:featureMember/*", "wfs:member/*", "gml:featureMembers/*"],
    count: 0,
    featureLimit: 0,
    harvestTypes: false,
    startPosition: 0,
    httpMethod: 'GET',
    resultType: 'results',
    wfsProfile: WfsProfile.default,
    featureTitleAttribute: '@gml:id'
};

export const wfsCapabilities: ImporterCapabilities = {
    isIncrementalSupported: false,
    supportedCatalogTypes: ['elasticsearch']
};

export const memberElements = {
    [WfsProfile.default]: ["gml:featureMember/*", "wfs:member/*", "gml:featureMembers/*"],
    [WfsProfile.pegelonline]: ["gml:featureMembers/gk:waterlevels"],
    [WfsProfile.zdm]: ["gml:featureMember"]
}
