import {EndpointInfo, EndpointMetadata, Middleware, Req} from "@tsed/common";
import {$log} from "ts-log-debug";

@Middleware()
export class AuthenticatedMiddleware {
    constructor() {
    }

    use(@EndpointInfo() endpoint: EndpointMetadata,
        @Req() request: Express.Request) {

        //retrieve Options passed to the Authenticated() decorators.
        const options = endpoint.store.get(AuthenticatedMiddleware) || {};
        $log.debug("AuthMiddleware =>", options);
        $log.debug("AuthMiddleware isAuthenticated ? =>", request.isAuthenticated());

        if (!request.isAuthenticated()) {
            // throw new Forbidden("Forbidden");
        }
    }
}
