import * as nodemailer from 'nodemailer';
import {ConfigService} from "../services/config/ConfigService";


export interface MailServerConfiguration {
    host: string,
    port: number,
    secure?: boolean,
    auth: {
        user: string,
        pass: string
    }
}

export interface Mail {
    from: string,
    to: string,
    subject: string,
    text: string
}

export class MailServer {
    private transporter: any;
    private static instance: MailServer;
    private active: boolean;

    private constructor() {
        let generalSettings = ConfigService.getGeneralSettings();
        if (generalSettings.mail && generalSettings.mail.mailServer) {
            this.transporter = nodemailer.createTransport(generalSettings.mail.mailServer);
        }
    }

    static getInstance(): MailServer {
        return new MailServer();
    }

    send(subject: string, text: string
    ) {
        let generalSettings = ConfigService.getGeneralSettings();
        if (generalSettings.mail && generalSettings.mail.enabled && generalSettings.mail.from && generalSettings.mail.to) {
            let mail: Mail = {
                from: generalSettings.mail.from,
                to: generalSettings.mail.to,
                subject: subject,
                text: text
            }
            this.sendMail(mail).catch(console.error);
        }
    }

    private sendMail = async (mail: Mail) => {
        // send mail using transporter
        let info = await this.transporter.sendMail(mail);
    };
}
