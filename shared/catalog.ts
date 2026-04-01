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

import type { ElasticsearchConfiguration } from './general-config.settings';

export type CatalogSettings = {
  id: number,
  type: string,
  // ED 2026-03-10: "connections" abstraction will be implemented at a later date; directly use URL for now
  // connectionId: string,
  url: string,
  name: string
};

export type PiveauCatalogSettings = CatalogSettings & {
  settings: {
    version: string,
    outputSchema: string,
    apiKey: string,
    catalog: string,
    title?: string,
    description?: string
  }
}

export type ElasticsearchCatalogSettings = CatalogSettings & {
  settings: ElasticsearchConfiguration & {
    dedupAliases: string | string[],
    mappingFile: string,
    // settingsFile: string
  }
}

export type CswCatalogSettings = CatalogSettings & {
  settings: {
    version: string,
    outputSchema: string,
  }
}

export type Catalog = CatalogSettings
  & Partial<PiveauCatalogSettings>
  & Partial<ElasticsearchCatalogSettings>
  & Partial<CswCatalogSettings>;

export type CatalogType = 'elasticsearch' | 'csw' | 'piveau';
