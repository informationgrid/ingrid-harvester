/*
 * Retrieve stored data
 */
SELECT dataset
FROM public.record
WHERE identifier = ANY($1)