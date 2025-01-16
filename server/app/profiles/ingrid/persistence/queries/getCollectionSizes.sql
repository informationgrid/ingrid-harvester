/*
 * Get the number of entries per collection
 */
SELECT c.id AS collection_id, COUNT(r.id) AS "count"
FROM public.collection c 
LEFT JOIN (
    SELECT * FROM public.record r
    WHERE deleted_on IS NULL
) as r
ON  r.collection_id = c.id
GROUP BY c.id