/*
 * Retrieve all identifier belonging to a catalog
 */
SELECT identifier
FROM public.record
WHERE $1 = ANY(catalog_ids)
    AND deleted_on IS NULL
