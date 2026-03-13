/*
 * Retrieve non-service records with original_document belonging to a particular source
 */
SELECT id, identifier, original_document
FROM public.record
WHERE source = $1
    AND deleted_on IS NULL
    AND dataset->'extras'->>'hierarchy_level' != 'service'