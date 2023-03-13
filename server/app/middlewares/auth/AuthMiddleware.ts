/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or – as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

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
