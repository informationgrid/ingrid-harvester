/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

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
        false AS is_service,
        secondary.created_on AS issued,
        secondary.last_modified AS modified
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
        AND anchor.dataset->'extras'->>'hierarchy_level' IS DISTINCT FROM 'service'
        AND anchor.deleted = false
		AND secondary.deleted = false
)
UNION
-- get all services for the datasets of a given source
(
    SELECT
        ds.id AS anchor_id,
        service.id AS id,
        service.source AS source,
        service.dataset AS dataset,
        service.collection_id AS catalog_id,
        true AS is_service,
        service.created_on AS issued,
        service.last_modified AS modified
    FROM public.record AS service
    LEFT JOIN public.record AS ds
    ON
        ds.identifier = ANY(service.operates_on)
        AND ds.source = service.source
    WHERE
        ds.source = $1
        AND service.dataset->'extras'->>'hierarchy_level' = 'service'
        AND service.deleted = false
		AND ds.deleted = false
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