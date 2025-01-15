/*
 * Get the number of entries per collection
 */
SELECT collection_id, COUNT(*)
FROM public.record
GROUP BY collection_id