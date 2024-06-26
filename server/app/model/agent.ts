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

export interface Agent {
    homepage?: string;
    mbox?: string;
    type?: string;
}

export interface Person extends Agent {
    name: string;
}

export interface Organization extends Agent {
    organization: string;
}

export interface Contact {
    fn: string,
    hasCountryName?: string,
    hasLocality?: string,
    hasPostalCode?: string,
    hasRegion?: string,
    hasStreetAddress?: string,
    hasEmail?: string,
    hasTelephone?: string,
    hasUID?: string,
    hasURL?: string,
    hasOrganizationName?: string
}
