import {MailServerConfiguration} from '../server/app/utils/nodemailer.utils';

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
