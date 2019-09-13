export type ElasticSettings = {
    elasticSearchUrl: string, index: string, indexType?: string, alias: string, deduplicationAlias?: string, includeTimestamp: boolean
}
