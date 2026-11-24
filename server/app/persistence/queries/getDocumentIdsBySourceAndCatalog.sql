/*
 * Retrieve the document ids of all records (including services) of a source that were harvested for a catalog.
 * Same value as createEsId() (ingrid.utils.ts): `id`, deprecated shape: `uuid`.
 */
SELECT COALESCE(dataset->>'id', dataset->>'uuid', identifier) AS id
FROM public.record
WHERE source = $1
    AND $2 = ANY(catalog_ids)
    AND deleted_on IS NULL
