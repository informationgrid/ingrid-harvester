/*
 * Retrieve services belonging to a particular source.
 * This generic default has no profile-agnostic way to identify services (that used to be
 * `harvest_metadata->>'hierarchy_level'`, now retired) and always returns no rows;
 * profiles that couple datasets/services (currently: ingrid, diplanung) provide their own override.
 */
SELECT id, dataset
FROM public.record
WHERE source = $1
    AND deleted_on IS NULL
    AND FALSE