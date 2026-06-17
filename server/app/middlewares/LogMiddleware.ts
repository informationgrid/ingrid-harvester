/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
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
import { Context, Middleware } from "@tsed/common";
import log4js from "log4js";

const log = log4js.getLogger("http");

@Middleware()
export class LogMiddleware {
    use(@Context() ctx: Context) {
        const { request, response } = ctx;
        const start = Date.now();

        response.getRes().on("finish", () => {
            const duration = Date.now() - start;
            log.info(`${request.getReq().method} ${request.getReq().url} ${response.getRes().statusCode} - ${duration}ms`);
        });
    }
}
