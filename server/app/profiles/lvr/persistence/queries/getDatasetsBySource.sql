/*
 * Retrieve non-service records belonging to a particular source
 */
SELECT id, identifier, dataset
FROM public.record
WHERE source = $1
    AND deleted_on IS NULL
    AND dataset->'extras'->>'hierarchy_level' != 'service'