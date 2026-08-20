SELECT identifier from public.record WHERE source = $1 and harvest_metadata->>'hierarchy_level' IS DISTINCT FROM 'service'
