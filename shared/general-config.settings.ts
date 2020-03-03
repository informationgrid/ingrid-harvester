export type GeneralSettings = {
    elasticSearchUrl: string,
    alias: string,
    proxy: string,
    sessionSecret: string,
    mail?: {
    	enabled?: boolean,
        mailServer?: MailServerConfiguration,
		from?: string,
    	to?: string
    },
    maxDiff?: number
};

export interface MailServerConfiguration {
    host: string,
    port: number,
    secure?: boolean,
    auth: {
        user: string,
        pass: string
    }
}