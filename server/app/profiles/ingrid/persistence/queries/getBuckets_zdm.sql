SELECT
    COALESCE(anchor.{{DATASET_COLUMN}}->>'typename', anchor.id::text) AS anchor_id,
    secondary.id AS id,
    secondary.identifier AS identifier,
    secondary.source AS source,
    secondary.{{DATASET_COLUMN}} AS dataset,
    secondary.collection_id AS catalog_id,
    null AS service_type,
    secondary.created_on AS issued,
    secondary.last_modified AS modified,
    secondary.deleted_on AS deleted
FROM public.record AS anchor
INNER JOIN public.record AS secondary
ON
    anchor.id = secondary.id
    OR (
        anchor.source != secondary.source
        AND (
            anchor.identifier = secondary.identifier
            OR anchor.{{DATASET_COLUMN}}->>'typename' = secondary.{{DATASET_COLUMN}}->>'typename'
        )
    )
WHERE anchor.source = $1
ORDER BY anchor_id
