/*
 * Retrieve services belonging to a particular source. A service record is identified differently
 * depending on which mapping produced it, so this unions the two ways to recognize one.
 */

-- current ('ingrid' mapping): metadata.document_type marks the service
(
    SELECT id, dataset
    FROM public.record
    WHERE source = $1
        AND deleted_on IS NULL
        AND dataset->'metadata'->>'document_type' = 'InGridGeoService'
)
UNION
-- deprecated ('ingrid-deprecated' / default-mapping.deprecated mapping): a top-level
-- `hierarchylevel` field marks the service instead. Drop this branch once the deprecated
-- mapping is retired.
(
    SELECT id, dataset
    FROM public.record
    WHERE source = $1
        AND deleted_on IS NULL
        AND dataset->>'hierarchylevel' = 'service'
)
