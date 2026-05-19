-- NO deduplication for ZDM WFS!
SELECT
    COALESCE({{DATASET_COLUMN}}->>'typename', id::text) AS anchor_id,
    id AS id,
    identifier AS identifier,
    source AS source,
    {{DATASET_COLUMN}} AS dataset,
    collection_id AS catalog_id,
    null AS service_type,
    created_on AS issued,
    last_modified AS modified,
    deleted_on AS deleted
FROM record
WHERE source = $1
ORDER BY anchor_id
