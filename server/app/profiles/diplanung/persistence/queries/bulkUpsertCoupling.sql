/*
 * Bulk insert of new records, update on conflict
 */
INSERT INTO public.coupling (dataset_identifier, service_id, service_type, distribution)
SELECT
    dataset_identifier,
    service_id,
    service_type,
    distribution
FROM json_populate_recordset(null::public.coupling, $1)
ON CONFLICT
ON CONSTRAINT coupling_full_identifier
DO UPDATE SET
    distribution = EXCLUDED.distribution