import {Context, type MiddlewareMethods, Inject, Middleware, Req} from "@tsed/common";
import {KeycloakService} from "../services/keycloak/KeycloakService.js";
import type {KeycloakAuthOptions} from "../decorators/KeycloakAuthOptions.js";

@Middleware()
export class KeycloakMiddleware implements MiddlewareMethods {
    @Inject()
    protected keycloakService: KeycloakService;

    public use(@Req() request: Express.Request, @Context() ctx: Context) {
        const options: KeycloakAuthOptions = ctx.endpoint.store.get(KeycloakMiddleware);
        const keycloak = this.keycloakService.getKeycloakInstance();

        if (request.session && request.session['keycloak-token']) {
            const token = JSON.parse(request.session['keycloak-token']);
            this.keycloakService.setToken(token);
            // In a real app, you should check for token expiration and refresh if needed
            return;
        }

        if (ctx.getRequest().kauth?.grant) {
            const grant = ctx.getRequest().kauth.grant;
            this.keycloakService.setToken(grant.access_token);
            if (request.session) {
                request.session['keycloak-token'] = JSON.stringify(grant.access_token);
                request.session['keycloak-refresh-token'] = JSON.stringify(grant.refresh_token);
            }
            return;
        }

        return keycloak.protect(options.role);
    }
}
