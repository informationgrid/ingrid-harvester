/*
 * Retrieve dataset identifiers for a particular source (used to fetch coupled services via OperatesOn).
 * This generic default has no profile-agnostic way to exclude services (that used to be
 * `harvest_metadata->>'hierarchy_level'`, now retired) and always returns no rows;
 * profiles that couple datasets/services (currently: ingrid, diplanung) provide their own override.
 */
SELECT identifier FROM public.record WHERE source = $1 AND FALSE
