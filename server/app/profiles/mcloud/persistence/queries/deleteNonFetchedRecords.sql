/*
 * Delete existing records that have not been fetched by the current harvesting process
 */
UPDATE public.record
SET deleted_on = $2
WHERE
    source = $1
    AND $2::timestamptz > created_on
    AND (
        last_modified IS NULL
        OR $2::timestamptz > last_modified
    )