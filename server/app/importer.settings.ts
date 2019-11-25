export type ImporterSettings = {
    blacklistedIds?: string[],
    cronPattern?: string,
    dateSourceFormats?: string[],
    defaultAttribution?: string,
    defaultAttributionLink?: string,
    defaultDCATCategory?: string[],
    defaultMcloudSubgroup?: string[],
    description?: string,
    disable?: boolean,
    dryRun?: boolean,
    id?: number,
    maxRecords?: number,
    proxy?: string,
    startPosition?: number,
    type: string
}
