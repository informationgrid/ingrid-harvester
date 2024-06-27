/*
 * Return number of
 * - total number of records for the source
 * - number of records for the source that were not fetched by the current harvesting process
 */
SELECT
	SUM(CASE WHEN (($2::timestamptz > created_on)
				AND (last_modified IS NULL OR $2::timestamptz > last_modified))
			THEN 1
			ELSE 0
		END) AS nonfetched,
	COUNT(*) AS total
FROM record
WHERE source = $1
