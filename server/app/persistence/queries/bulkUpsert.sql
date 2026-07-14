/*
 * Bulk insert of new records, update on conflict
 */
INSERT INTO public.record (identifier, source, collection_id, catalog_ids, harvest_metadata, dataset, dataset_csw, dataset_dcatapde, original_document)
SELECT
    identifier,
    source,
    collection_id,
    catalog_ids,
    harvest_metadata,
    dataset,
    dataset_csw,
    dataset_dcatapde,
    original_document
FROM json_populate_recordset(null::public.record, $1)
ON CONFLICT
ON CONSTRAINT record_full_identifier
DO UPDATE SET
    catalog_ids = EXCLUDED.catalog_ids,
    harvest_metadata = COALESCE(EXCLUDED.harvest_metadata, record.harvest_metadata),
    dataset = EXCLUDED.dataset,
    dataset_csw = EXCLUDED.dataset_csw,
    dataset_dcatapde = EXCLUDED.dataset_dcatapde,
    original_document = COALESCE(EXCLUDED.original_document, record.original_document),
    last_modified = NOW(),
    deleted_on = NULL
