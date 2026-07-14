/*
 * Retrieve services belonging to a particular source
 */
SELECT id, dataset
FROM public.record
WHERE source = $1
    AND deleted_on IS NULL
    AND harvest_metadata->>'hierarchy_level' = 'service'