/*
 * Delete a collection
 */
DELETE 
FROM public.collection
WHERE
    id = $1