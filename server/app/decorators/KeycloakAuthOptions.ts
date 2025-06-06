import {Returns} from "@tsed/schema";
import {UseAuth} from "@tsed/common";
import {useDecorators} from "@tsed/core";
import {Security} from "@tsed/schema";
import {KeycloakMiddleware} from "../middlewares/KeycloakMiddleware";

export interface KeycloakAuthOptions extends Record<string, any> {
    role?: string;
    scopes?: string[];
}

export function KeycloakAuth(options: KeycloakAuthOptions = {}): Function {
    return useDecorators(UseAuth(KeycloakMiddleware, options), Security("oauth2", ...(options.scopes || [])), Returns(403));
}
