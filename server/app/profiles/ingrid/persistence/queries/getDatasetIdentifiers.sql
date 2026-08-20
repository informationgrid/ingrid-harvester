SELECT identifier from public.record WHERE source = $1 and dataset->'metadata'->>'document_type' IS DISTINCT FROM 'InGridGeoService'
