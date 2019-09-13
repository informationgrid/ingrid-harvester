import {AuthenticatedMiddleware, EndpointInfo, EndpointMetadata, IMiddleware, OverrideProvider, Req} from "@tsed/common";
import {Unauthorized} from 'ts-httpexceptions';

@OverrideProvider(AuthenticatedMiddleware)
export class AuthMiddleware implements IMiddleware {
    constructor() {
    }

    use(@Req() request: Express.Request, @EndpointInfo() endpoint: EndpointMetadata) {

        //retrieve Options passed to the Authenticated() decorators.
        const options = endpoint.store.get(AuthenticatedMiddleware) || {};
        //$log.debug("AuthMiddleware =>", options);
        //$log.debug("AuthMiddleware isAuthenticated ? =>", request.isAuthenticated());

        if (!request.isAuthenticated()) {
            throw new Unauthorized("Unauthorized");
        }
    }
}
