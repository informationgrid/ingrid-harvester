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
 * Bulk insert of new records, update on conflict
 */
INSERT INTO public.record (identifier, source, collection_id, dataset, original_document)
SELECT
    identifier,
    source,
    collection_id,
    dataset,
    original_document
FROM json_populate_recordset(null::public.record, $1)
ON CONFLICT
ON CONSTRAINT record_full_identifier
DO UPDATE SET
    dataset = EXCLUDED.dataset,
    original_document = COALESCE(EXCLUDED.original_document, record.original_document),
    last_modified = NOW(),
    deleted_on = NULL
-- WHERE (
--     record.dataset->'extras'->'metadata'->'modified' IS NULL
--     OR EXCLUDED.dataset->'extras'->'metadata'->'modified' > record.dataset->'extras'->'metadata'->'modified'
-- )
-- WHERE
--     (
--         EXCLUDED.dataset->'modified' IS NOT NULL
--         AND record.dataset->'modified' IS NULL
--     )
--     OR EXCLUDED.dataset->'modified' > record.dataset->'modified'
-- ) OR (
--     (
--         EXCLUDED.dataset->'extras'->'metadata'->'modified' IS NOT NULL
--         AND record.dataset->'extras'->'metadata'->'modified' IS NULL
--     )
--     OR EXCLUDED.dataset->'extras'->'metadata'->'modified' > record.dataset->'extras'->'metadata'->'modified'
-- )