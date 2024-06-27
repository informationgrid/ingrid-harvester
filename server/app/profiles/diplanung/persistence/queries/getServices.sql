/*
 * Retrieve services belonging to a particular source
 */
SELECT id, dataset
FROM public.record
WHERE source = $1
    AND deleted_on = NULL
    AND dataset->'extras'->>'hierarchy_level' = 'service'