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