/*
 * Move records form one collection to another.
 */
UPDATE public.record
SET collection_id = $2
WHERE
    collection_id = $1