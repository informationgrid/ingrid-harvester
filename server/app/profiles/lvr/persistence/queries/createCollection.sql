/*
 * Create a collection
 */
INSERT INTO public.collection (identifier, properties, original_document, dcat_ap_plu, json)
VALUES($1, $2, $3, $4, $5)
RETURNING id