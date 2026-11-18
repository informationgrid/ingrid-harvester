SELECT identifier from public.record WHERE source = $1 and dataset->'ingrid'->>'document_type' IS DISTINCT FROM 'InGridGeoService'
