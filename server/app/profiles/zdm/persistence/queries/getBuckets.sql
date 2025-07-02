/*
 * This is a quite complex query, but runs reasonably fast. It is a UNION of three queries:
 * - get datasets and deduplicated datasets
 * - get services operating on the datasets
 * - get services operating on the deduplicated datasets
 * They are all identified by the `anchor_id` which is the id of the "original" dataset
 */

SELECT
    dataset->>'typename' AS anchor_id,
    id,
    identifier,
    source,
    collection_id AS catalog_id,
    dataset,
    original_document,
    null AS service_type,
    created_on AS issued,
    last_modified AS modified,
    deleted_on AS deleted
FROM
    record
WHERE
    source = $1
ORDER BY
    identifier, anchor_id
