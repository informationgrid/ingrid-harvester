/*
 * Retrieve dcat-ap.de records belonging to a particular source
 */
SELECT id, identifier, dataset_dcatapde
FROM public.record
WHERE source = $1
    AND deleted_on IS NULL
