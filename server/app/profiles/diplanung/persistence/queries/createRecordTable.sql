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
 * Create the record table
 */
CREATE TABLE IF NOT EXISTS public.record (
    id SERIAL,
    identifier VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,
    collection_id INTEGER,
    dataset JSONB,
    original_document TEXT,
    created_on TIMESTAMP(3) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP(3) with time zone NULL,
    deleted_on TIMESTAMP(3) with time zone NULL,
    CONSTRAINT record_pkey PRIMARY KEY(id),
    CONSTRAINT record_full_identifier UNIQUE(identifier, collection_id, source),
    CONSTRAINT fkivo5l0rletq7kni6xstvejy5a FOREIGN KEY(collection_id) REFERENCES public.collection(id)
);

CREATE INDEX IF NOT EXISTS record_identifier_idx
ON public.record (identifier);

CREATE INDEX IF NOT EXISTS record_planName_idx
ON public.record ((dataset->>'plan_name'));