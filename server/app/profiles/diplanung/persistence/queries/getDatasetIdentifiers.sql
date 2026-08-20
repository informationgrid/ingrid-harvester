SELECT identifier from public.record WHERE source = $1 and dataset->'extras'->>'hierarchy_level' IS DISTINCT FROM 'service'
