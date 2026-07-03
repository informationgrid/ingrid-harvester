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

import { Configuration, PlatformApplication, PlatformConfiguration, $log as tsedLogger, type BeforeRoutesInit, type OnInit, type OnReady } from '@tsed/common';
import { Inject } from '@tsed/di';
import { PlatformAcceptMimesMiddleware } from '@tsed/platform-accept-mimes';
import bodyParser from 'body-parser';
import compress from 'compression';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import log4js from 'log4js';
import methodOverride from 'method-override';
import * as path from 'path';
import log4jsDevConfig from '../log4js-dev.json' with { type: 'json' };
import log4jsConfig from '../log4js.json' with { type: 'json' };
import serverConfig from '../server-config.json' with { type: 'json' };
import { LogMiddleware } from './middlewares/LogMiddleware.js';
import { ProfileFactoryLoader } from './profiles/profile.factory.loader.js';
import { ConfigService } from './services/config/ConfigService.js';
import { KeycloakService } from './services/keycloak/KeycloakService.js';
import './utils/tsed.log4js.forwarder.js';
import { configure as harvestJobConfigure } from './utils/harvest-log-appender.js';
import { jsonLayout } from './utils/log4js.json.layout.js';

const rootDir = import.meta.dirname;

const log = log4js.getLogger(import.meta.filename);

const isProduction = process.env.NODE_ENV == 'production';
log4js.addLayout("json", jsonLayout);
const baseLog4jsConfig: any = isProduction ? log4jsConfig : log4jsDevConfig;
log4js.configure({
    ...baseLog4jsConfig,
    appenders: {
        ...baseLog4jsConfig.appenders,
        harvestJob: { type: { configure: harvestJobConfigure } },
    },
    categories: {
        ...baseLog4jsConfig.categories,
        default: {
            ...baseLog4jsConfig.categories.default,
            appenders: [...baseLog4jsConfig.categories.default.appenders, 'harvestJob'],
        },
    },
});
// re-route the ts.ed logger through log4js
tsedLogger.appenders.clear();
tsedLogger.appenders.set("log4js-forwarder", {
    type: "log4js",
    levels: ["trace", "debug", "info", "warn", "error", "fatal"],
});

const baseURL = process.env.BASE_URL ?? '/';

// TODO a) instead of overwriting internal Before and On interfaces, use hooks: https://tsed.dev/docs/hooks.html#subscribe-to-a-hook
// TODO b) instead of using a custom LogMiddleware, use {PlatformLogMiddleware} from "@tsed/platform-log-middleware"

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
        // '/keycloak.js': [{
        //     root: `./keycloak.js`}],
        [createRelativePath(baseURL)]: `${rootDir}/webapp`,
        [createRelativePath(baseURL, '*')]: `${rootDir}/webapp/index.html`
    },
    logger: {
        ignoreUrlPatterns: ['/rest/*'],
        disableRoutesSummary: isProduction
    },
    middlewares: [
        LogMiddleware,
    ],
})
export class Server implements BeforeRoutesInit, OnInit, OnReady {

    @Configuration()
    settings: PlatformConfiguration;

    constructor(@Inject(PlatformApplication) public app: PlatformApplication,
                @Inject(KeycloakService) protected keycloakService: KeycloakService) {
    }

    async $onInit(): Promise<any> {
        // on startup make sure ENV variables - if set - replace existing configuration vars
        ConfigService.adoptEnvs();
    }

    /**
     * This method let you configure the express middleware required by your application to works.
     * @returns {Server}
     */
    async $beforeRoutesInit(): Promise<any> {
        // on startup make sure the configuration has IDs for each harvester
        ConfigService.fixIDs();
      let cookieConfig = ConfigService.getGeneralSettings().session.cookie;
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
                // @ts-ignore
                maxAge: 36000,
                cookie: {
                    path: createRelativePath(baseURL),
                    httpOnly: cookieConfig.httpOnly,
                    secure: cookieConfig.secure,
                    maxAge: cookieConfig.maxAge
                },
                store: this.keycloakService.getMemoryStore()
                // store: new MemoryStore({
                //     checkPeriod: 86400000 // prune expired entries every 24h
                // })
            }))
            .use(this.keycloakService.getKeycloakInstance().middleware());
    }

    async $onReady(): Promise<any> {
        log.info('Setting up profile');
        const profile = ProfileFactoryLoader.get();
        await profile.init();
        log.info('Server initialized');
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
