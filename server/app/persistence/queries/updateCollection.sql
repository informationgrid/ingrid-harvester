/*
 * Update a collection
 */
UPDATE public.collection
SET
    properties = $2,
    original_document = $3,
    dcat_ap_plu = $4,
    json = $5,
    last_modified = NOW()
WHERE
    identifier = $1
RETURNING id