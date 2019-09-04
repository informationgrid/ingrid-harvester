export type ImporterSettings = {
    id?: number, description?: string, type: string, proxy?: string, dryRun?: boolean, disable?: boolean,
    maxRecords?: number,
    startPosition?: number,
    defaultMcloudSubgroup?: string[],
    defaultDCATCategory?: string[],
    defaultAttribution?: string,
    defaultAttributionLink?: string,
    cronPattern?: string,
    dateSourceFormats?: string[]
}
