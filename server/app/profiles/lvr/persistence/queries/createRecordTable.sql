/*
 * Create the record table
 */
CREATE TABLE IF NOT EXISTS public.record (
    id SERIAL,
    identifier VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,
    collection_id INTEGER,
    dataset JSONB,
    original_document TEXT,
    created_on TIMESTAMP(3) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP(3) with time zone NULL,
    deleted_on TIMESTAMP(3) with time zone NULL,
    CONSTRAINT record_pkey PRIMARY KEY(id),
    CONSTRAINT record_full_identifier UNIQUE(identifier, collection_id, source),
    CONSTRAINT fkivo5l0rletq7kni6xstvejy5a FOREIGN KEY(collection_id) REFERENCES public.collection(id)
);

CREATE INDEX IF NOT EXISTS record_identifier_idx
ON public.record (identifier);
