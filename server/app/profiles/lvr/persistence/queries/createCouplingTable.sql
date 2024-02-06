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
 * Create the coupling table
 */
CREATE TABLE IF NOT EXISTS public.coupling (
    id SERIAL,
    dataset_identifier VARCHAR(255) NOT NULL,
    service_id VARCHAR(255) NOT NULL,
    service_type VARCHAR(255) NOT NULL,
    distribution JSONB,
    CONSTRAINT coupling_pkey PRIMARY KEY(id),
    CONSTRAINT coupling_full_identifier UNIQUE(dataset_identifier, service_id, service_type)
);

CREATE INDEX IF NOT EXISTS dataset_identifier_idx
ON public.coupling (dataset_identifier);

CREATE INDEX IF NOT EXISTS service_id_idx
ON public.coupling (service_id);