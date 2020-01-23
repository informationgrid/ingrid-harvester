export interface CronData {
    pattern: string;
    active: boolean;
}

export type ImporterSettings = {
    blacklistedIds?: string[],
    cron?: CronData,
    customCode?: string,
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
    showCompleteSummaryInfo?: boolean;
    startPosition?: number,
    type: string,
    whitelistedIds?: string[]
}
