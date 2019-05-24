import {ServerLoader, ServerSettings, GlobalAcceptMimesMiddleware} from "@tsed/common";
import {ConfigService} from './services/config/ConfigService';
// const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
// const compress = require('compression');
// const methodOverride = require('method-override');
const rootDir = __dirname;

@ServerSettings({
    rootDir,
    acceptMimes: ["application/json"],
    passport: {}
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
