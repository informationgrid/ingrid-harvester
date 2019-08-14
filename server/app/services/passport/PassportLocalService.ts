import {AfterRoutesInit, BeforeRoutesInit, ExpressApplication, Inject, ServerSettingsService, Service} from "@tsed/common";
import * as Passport from "passport";
import {Strategy} from "passport-local";
import {NotFound} from "ts-httpexceptions";
import {UsersService} from "../users/UsersService";
import {IUser} from "../../model/User";

@Service()
export class PassportLocalService implements BeforeRoutesInit, AfterRoutesInit {

    constructor(private usersService: UsersService,
                private serverSettings: ServerSettingsService,
                @Inject(ExpressApplication) private  expressApplication: ExpressApplication) {

        // used to serialize the user for the session
        Passport.serializeUser(PassportLocalService.serialize);

        // used to deserialize the user
        Passport.deserializeUser(this.deserialize.bind(this));
    }

    $beforeRoutesInit() {
        const options: any = this.serverSettings.get("passport") || {} as any;
        const {userProperty, pauseStream} = options;

        this.expressApplication.use(Passport.initialize({userProperty}));
        this.expressApplication.use(Passport.session({pauseStream}));
    }

    $afterRoutesInit() {
        this.initializeLogin();
    }

    /**
     *
     * @param user
     * @param done
     */
    static serialize(user: IUser, done) {
        delete user.password;
        done(null, user.username);
    }

    /**
     *
     * @param id
     * @param done
     */
    public deserialize(id, done) {
        done(null, this.usersService.find(id));
    };


    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    public initializeLogin() {
        Passport.use("login", new Strategy({
            passReqToCallback: true // allows us to pass back the entire request to the callback
        }, (req, username, password, done) => {
            this.login(username, password)
                .then((user) => done(null, user))
                .catch((err) => done(err));
        }));
    }

    /**
     *
     * @param username
     * @param password
     * @returns {Promise<boolean>}
     */
    async login(username: string, password: string): Promise<IUser> {
        const user = await this.usersService.findByCredential(username, password);
        if (user) {
            return user;
        }

        throw new NotFound("User not found");
    };
}
