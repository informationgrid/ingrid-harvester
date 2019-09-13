import {BodyParams, Controller, Get, Post, Req, Required, Res} from "@tsed/common";
import * as Express from "express";
import * as Passport from "passport";
import {IUser} from "../../model/User";

@Controller("/passport")
export class PassportCtrl {
    /**
     * Authenticate user with local info (in Database).
     * @param username
     * @param password
     * @param request
     * @param response
     */
    @Post("/login")
    async login(@Required() @BodyParams("username") username: string,
                @Required() @BodyParams("password") password: string,
                @Req() request: Express.Request,
                @Res() response: Express.Response) {

        return new Promise<IUser>((resolve, reject) => {
            Passport
                .authenticate("login", (err, user: IUser) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    request.logIn(user, (err) => {

                        if (err) {
                            reject(err);
                        } else {
                            resolve(user);
                        }
                    });

                })(request, response, () => {
                });
        });

    }

    /**
     * Disconnect user
     * @param request
     */
    @Get("/logout")
    public logout(@Req() request: Express.Request): string {
        request.logout();
        return "Disconnected";
    }

}
