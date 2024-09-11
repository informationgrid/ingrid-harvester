/*
 * Create the collection table
 */
CREATE TABLE IF NOT EXISTS public.collection (
    id SERIAL,
    identifier VARCHAR(255) NOT NULL UNIQUE,
    properties JSONB,
    original_document TEXT,
    dcat_ap_plu TEXT,
    json TEXT,
    created_on TIMESTAMP(3) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP(3) with time zone NULL,
    CONSTRAINT collection_pkey PRIMARY KEY(id)
)