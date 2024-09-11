/*
 * This is a quite complex query, but runs reasonably fast. It is a UNION of three queries:
 * - get datasets and deduplicated datasets
 * - get services operating on the datasets
 * - get services operating on the deduplicated datasets
 * They are all identified by the `anchor_id` which is the id of the "original" dataset
 */

-- get all datasets of a given source, and all their duplicates from other sources (determined by dataset->>'plan_name')
(
    SELECT
        anchor.id AS anchor_id,
        secondary.id AS id,
        secondary.source AS source,
        secondary.dataset AS dataset,
        secondary.collection_id AS catalog_id,
        null AS service_type,
        secondary.created_on AS issued,
        secondary.last_modified AS modified,
        secondary.deleted_on AS deleted
    FROM public.record AS anchor
    LEFT JOIN public.record AS secondary
    ON (
            anchor.dataset->>'plan_name' = secondary.dataset->>'plan_name'
            OR (
                anchor.identifier = secondary.identifier
                AND anchor.collection_id = secondary.collection_id
            )
        )
        AND (
            anchor.source != secondary.source
            OR anchor.id = secondary.id
        )
    WHERE
        anchor.source = $1
--        AND anchor.dataset->'extras'->>'hierarchy_level' IS DISTINCT FROM 'service'
)
UNION
-- get all services for the datasets of a given source
(
    SELECT
        ds.id AS anchor_id,
        coupling.id AS id,
        ds.source AS source,
        service.dataset AS dataset,
        ds.collection_id AS catalog_id,
        coupling.service_type AS service_type,
        ds.created_on AS issued,
        ds.last_modified AS modified,
        ds.deleted_on AS deleted
    FROM public.coupling AS coupling
    LEFT JOIN public.record AS ds
    ON ds.identifier = coupling.dataset_identifier
    LEFT JOIN public.record AS service
    ON coupling.service_id = service.id::varchar(255)
    WHERE
        ds.source = $1
)
/*
-- TODO below query takes ages - improve it
UNION
-- get all services for the deduplicated datasets of datasets of a given source
(
    SELECT
        ds.id AS anchor_id,
        service.id AS id,
        service.source AS source,
        service.dataset AS dataset,
        true AS is_service,
        service.created_on AS issued,
        service.last_modified AS modified
    FROM public.record AS service
    LEFT JOIN (
        SELECT
            secondary.id AS id,
            secondary.identifier AS identifier,
            secondary.source AS source
        FROM public.record AS anchor
        LEFT JOIN public.record AS secondary
        ON
            anchor.dataset->>'plan_name' = secondary.dataset->>'plan_name'
            AND (anchor.source != secondary.source OR anchor.id = secondary.id)
        WHERE
            anchor.source = $1
            AND anchor.dataset->'extras'->>'hierarchy_level' IS DISTINCT FROM 'service'
    ) AS ds
    ON
        ds.identifier = ANY(service.operates_on)
        AND ds.source = service.source
    WHERE
        ds.source = $1
        AND service.dataset->'extras'->>'hierarchy_level' = 'service'
)
*/
ORDER BY anchor_id
