/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

import * as nodemailer from 'nodemailer';
import { ConfigService } from '../services/config/ConfigService';
import { ProfileFactoryLoader } from '../profiles/profile.factory.loader';

const log = require('log4js').getLogger(__filename);

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
        if (generalSettings.mail?.mailServer) {
            this.transporter = nodemailer.createTransport(generalSettings.mail.mailServer);
        }
    }

    static getInstance(): MailServer {
        return new MailServer();
    }

    send(subject: string, text: string) {
        let { mail: mailConfig } = ConfigService.getGeneralSettings();
        if (mailConfig?.enabled && mailConfig?.from && mailConfig?.to) {
            let tag = `[${ProfileFactoryLoader.get().getProfileName()}] `;
            if (mailConfig.subjectTag) {
                tag = `[${mailConfig.subjectTag}] `;
            }
            let mail: Mail = {
                from: mailConfig.from,
                to: mailConfig.to,
                subject: tag + subject,
                text: text
            };
            this.sendMail(mail).catch(err => log.error(err));
        }
    }

    private sendMail = async (mail: Mail) => {
        // send mail using transporter
        let info = await this.transporter.sendMail(mail);
    };
}
