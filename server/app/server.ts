import {GlobalAcceptMimesMiddleware, ServerLoader, ServerSettings} from '@tsed/common';
import {ConfigService} from './services/config/ConfigService';
import {configure} from 'log4js';
// const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const serverConfig = require('./server-config.json');
// const compress = require('compression');
// const methodOverride = require('method-override');
const rootDir = __dirname;

configure('./log4js.json');

@ServerSettings({
    rootDir,
    httpPort: serverConfig.httpPort,
    socketIO: {},
    acceptMimes: ["application/json"],
    passport: {},
    statics: {
        "/": `${rootDir}/webapp`
    },
    logger: {
        logRequest: false
    }
})
export class Server extends ServerLoader {
    /**
     * This method let you configure the express middleware required by your application to works.
     * @returns {Server}
     */
    public $onMountingMiddlewares(): void|Promise<any> {

        const session = require("express-session");

        // on startup make sure the configuration has IDs for each harvester
        ConfigService.fixIDs();

        this
            .use(GlobalAcceptMimesMiddleware)
            // .use(cookieParser())
            // .use(compress({}))
            // .use(methodOverride())
            .use(bodyParser.json())
            .use(bodyParser.urlencoded({
                extended: true
            }))
            .use(session({
                secret: "mysecretkey",
                resave: true,
                saveUninitialized: true,
                maxAge: 36000,
                cookie: {
                    path: "/",
                    httpOnly: true,
                    secure: false,
                    maxAge: null
                }
            }));

        return null;
    }
}
