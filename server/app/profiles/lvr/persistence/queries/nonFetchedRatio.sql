/*
 * For a specific source, return
 * - total number of records
 * - number of records that were not fetched by the current harvesting process
 */
SELECT
    SUM(CASE WHEN ((created_on < $2::timestamptz)
                AND (last_modified IS NULL OR last_modified < $2::timestamptz))
            THEN 1
            ELSE 0
        END) AS nonfetched,
    COUNT(*) AS total
FROM record
WHERE source = $1