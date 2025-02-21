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

import { $log, Configuration, PlatformAcceptMimesMiddleware, PlatformApplication, PlatformLogMiddleware } from '@tsed/common';
import { Inject } from '@tsed/di';
import { addLayout, configure } from 'log4js';
import * as path from 'path';
import { ProfileFactoryLoader } from './profiles/profile.factory.loader';
import { ConfigService } from './services/config/ConfigService';
import { jsonLayout } from './utils/log4js.json.layout';

const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const serverConfig = require('../server-config.json');
const methodOverride = require('method-override');
const compress = require("compression");
const rootDir = __dirname;
const session = require('express-session');
const MemoryStore = require('memorystore')(session);

const log = require('log4js').getLogger(__filename);

const isProduction = process.env.NODE_ENV == 'production';
addLayout("json", jsonLayout);
if (isProduction) {
    configure('./log4js.json');
    $log.appenders.set("stdout", {
        type: "stdout",
        levels: ["info", "debug"],
        layout: {
            type: "json"
        }
    });
    $log.appenders.set("stderr", {
        levels: ["trace", "fatal", "error", "warn"],
        type: "stderr",
        layout: {
            type: "json"
        }
    });
}
else {
    configure('./log4js-dev.json');
}

const baseURL = process.env.BASE_URL ?? '/';

@Configuration({
    rootDir,
    httpPort: serverConfig.httpPort,
    socketIO: {
        path: createRelativePath(baseURL, 'socket.io'),
        cors: { origin: true }
    },
    acceptMimes: ['application/json'],
    passport: {},
    statics: {
        [createRelativePath(baseURL)]: `${rootDir}/webapp`,
        [createRelativePath(baseURL, '*')]: `${rootDir}/webapp/index.html`
    },
    logger: {
        ignoreUrlPatterns: ['/rest/*'],
        disableRoutesSummary: isProduction,
        // level: "warn"
    },
    middlewares: [{ use: PlatformLogMiddleware, options: { logRequest: false } }]
})
export class Server {

    @Inject()
    app: PlatformApplication;

    @Configuration()
    settings: Configuration;

    public $beforeInit(): void | Promise<any> {
        // on startup make sure ENV variables - if set - replace existing configuration vars
        ConfigService.adoptEnvs();
    }

    /**
     * This method let you configure the express middleware required by your application to works.
     * @returns {Server}
     */
    public $beforeRoutesInit(): void | Promise<any> {

        // on startup make sure the configuration has IDs for each harvester
        ConfigService.fixIDs();

        this.app
            .use(PlatformAcceptMimesMiddleware)
            .use(cookieParser())
            .use(compress({}))
            .use(methodOverride())
            .use(bodyParser.json({limit: '100mb'}))
            .use(bodyParser.urlencoded({
                extended: true
            }))
            .use(session({
                secret: ConfigService.getGeneralSettings().sessionSecret,
                resave: true,
                saveUninitialized: true,
                maxAge: 36000,
                cookie: {
                    path: createRelativePath(baseURL),
                    httpOnly: true,
                    secure: false,
                    maxAge: null
                },
                store: new MemoryStore({
                    checkPeriod: 86400000 // prune expired entries every 24h
                })
            }));

        return null;
    }

    async $onReady() {
        log.info('Setting up profile');
        const profile = ProfileFactoryLoader.get();
        await profile.init();
        log.info('Server initialized');
    }

    $onServerInitError(error): any {
        log.error('Server encounter an error: ', error);
    }
}

export function createRelativePath(...pathSegments: string[]) {
    if (pathSegments == null || pathSegments.length == 0) {
        return null;
    }
    let url = new URL('http://localhost');
    url.pathname = path.join(...pathSegments);
    return url.pathname;
}
