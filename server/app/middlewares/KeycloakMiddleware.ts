import {Context, MiddlewareMethods, Inject, Middleware} from "@tsed/common";
import {KeycloakService} from "../services/keycloak/KeycloakService";
import {KeycloakAuthOptions} from "../decorators/KeycloakAuthOptions";

@Middleware()
export class KeycloakMiddleware implements MiddlewareMethods {
    @Inject()
    protected keycloakService: KeycloakService;

    public use(@Context() ctx: Context) {
        const options: KeycloakAuthOptions = ctx.endpoint.store.get(KeycloakMiddleware);
        const keycloak = this.keycloakService.getKeycloakInstance();

        if (ctx.getRequest().kauth.grant) {
            this.keycloakService.setToken(ctx.getRequest().kauth.grant.access_token);
        }

        return keycloak.protect(options.role);
    }
}
