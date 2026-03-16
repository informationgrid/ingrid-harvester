import {Returns} from "@tsed/schema";
import {UseAuth} from "@tsed/common";
import {useDecorators} from "@tsed/core";
import {Security} from "@tsed/schema";
import {AuthMiddleware} from "../middlewares/auth/AuthMiddleware.js";

export interface KeycloakAuthOptions extends Record<string, any> {
    role?: string;
    scopes?: string[];
}

export function KeycloakAuth(options: KeycloakAuthOptions = {}): Function {
    return useDecorators(UseAuth(AuthMiddleware, options), Security("oauth2", ...(options.scopes || [])), Returns(403));
}
