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

(
	SELECT anchor.id AS anchor_id,
		secondary.id AS id,
		secondary.source AS source,
		secondary.dataset AS dataset,
		false AS is_service,
		secondary.created_on AS issued,
		secondary.last_modified AS modified
	FROM public.${this.datasetTableName} AS anchor
	LEFT JOIN public.${this.datasetTableName} AS secondary
	ON anchor.dataset->>'alternateTitle' = secondary.dataset->>'alternateTitle'
	WHERE anchor.source = $1
		AND anchor.dataset->'extras'->>'hierarchy_level' IS DISTINCT FROM 'service'
)
UNION
(
	SELECT ds.id AS anchor_id,
		service.id AS id,
		service.source AS source,
		service.dataset AS dataset,
		true AS is_service,
		service.created_on AS issued,
		service.last_modified AS modified
	FROM public.${this.datasetTableName} AS service
	LEFT JOIN public.${this.datasetTableName} AS ds
	ON ds.identifier = ANY(service.operates_on)
	WHERE ds.source = $1
		AND service.dataset->'extras'->>'hierarchy_level' = 'service'
)
ORDER BY anchor_id`;