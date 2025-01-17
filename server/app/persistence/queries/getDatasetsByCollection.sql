/*
 * Retrieve non-service records belonging to a particular collection
 */
SELECT id, identifier, dataset
FROM public.record
WHERE collection_id = $1
    AND deleted_on IS NULL
    AND dataset->'extras'->>'hierarchy_level' != 'service'