/*
 * Delete all records from a collection
 */
DELETE FROM public.record
WHERE
    collection_id = $1