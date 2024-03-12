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

/*
 * Create the collection table
 */
CREATE TABLE IF NOT EXISTS public.collection (
    id SERIAL,
    identifier VARCHAR(255) NOT NULL UNIQUE,
    properties JSONB,
    original_document TEXT,
    dcat_ap_plu TEXT,
    json TEXT,
    created_on TIMESTAMP(3) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP(3) with time zone NULL,
    CONSTRAINT collection_pkey PRIMARY KEY(id)
)