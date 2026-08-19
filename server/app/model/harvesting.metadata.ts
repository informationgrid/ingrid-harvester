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

/**
 * Internal harvesting bookkeeping for a record.
 *
 * This is NOT part of the index document format. It is persisted in the
 * `record.harvest_metadata` column and carried alongside the document
 * (see `BucketDocument`) during catalog processing.
 */
export type HarvestingMetadata = {
    source: MetadataSource,
    hierarchy_level?: string,   // only set for CSW records; used to distinguish datasets from services
};

export type MetadataSource = {
    source_base: string,
    source_type: string,
};
