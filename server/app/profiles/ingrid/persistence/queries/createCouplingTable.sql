/*
 * Create the coupling table
 */
CREATE TABLE IF NOT EXISTS public.coupling (
    id SERIAL,
    dataset_identifier VARCHAR(255) NOT NULL,
    service_id VARCHAR(255) NOT NULL,
    service_type VARCHAR(255) NOT NULL,
    distribution JSONB,
    CONSTRAINT coupling_pkey PRIMARY KEY(id),
    CONSTRAINT coupling_full_identifier UNIQUE(dataset_identifier, service_id, service_type)
);

CREATE INDEX IF NOT EXISTS dataset_identifier_idx
ON public.coupling (dataset_identifier);

CREATE INDEX IF NOT EXISTS service_id_idx
ON public.coupling (service_id);