/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import { addLayout, configure } from 'log4js';
import { jsonLayout } from './utils/log4js.json.layout';
import { ConfigService } from './services/config/ConfigService';
import { ElasticsearchFactory } from './persistence/elastic.factory';
import { GlobalAcceptMimesMiddleware, ServerLoader, ServerSettings } from '@tsed/common';
import { IndexConfiguration } from './persistence/elastic.setting';
import { ProfileFactoryLoader } from './profiles/profile.factory.loader';
import { Summary } from './model/summary';
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const serverConfig = require('../server-config.json');
const methodOverride = require('method-override');
const compress = require("compression");
const rootDir = __dirname;
const session = require('express-session');
import './middlewares/auth/AuthMiddleware';

addLayout("json", jsonLayout);
configure('./log4js.json');

@ServerSettings({
    rootDir,
    httpPort: serverConfig.httpPort,
    socketIO: { },
    acceptMimes: ['application/json'],
    passport: {},
    statics: {
        '/': `${rootDir}/webapp`,
        '/*': `${rootDir}/webapp/index.html`
    },
    logger: {
        logRequest: false
    },
    mount: {
        '/rest': `${rootDir}/controllers/**/*.ts`
    },
    componentsScan: [
        `${rootDir}/middlewares/**/*.ts`,
        `${rootDir}/services/**/*.ts`,
        `${rootDir}/converters/**/*.ts`
    ],
})
export class Server extends ServerLoader {

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

        this
            .use(GlobalAcceptMimesMiddleware)
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
                    path: '/',
                    httpOnly: true,
                    secure: false,
                    maxAge: null
                }
            }));

        return null;
    }

    $onReady() {
        // try to initialize the ES index if it does not exist
        let profile = ProfileFactoryLoader.get();
        let indexConfig: IndexConfiguration = {
            ...ConfigService.getGeneralSettings().elasticsearch,
            // includeTimestamp: true,
            index: "index_name_here",   // TODO
            // dryRun: settings.dryRun,
            // addAlias: !settings.disable
        };
        let elastic = ElasticsearchFactory.getElasticUtils(indexConfig, new Summary({ index: '', isIncremental: false, maxConcurrent: 0, type: '' }));
        elastic.prepareIndex(profile.getIndexMappings(), profile.getIndexSettings(), true);
        console.log("Server initialized");
    }

    $onServerInitError(error): any {
        console.error("Server encounter an error =>", error);
    }
}
