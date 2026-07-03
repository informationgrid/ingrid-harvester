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

import { Appender, BaseAppender, type LogEvent } from "@tsed/logger";
import log4js from "log4js";

/**
 * Ts.ED logger appender that forwards log events to log4js.
 * This allows for consistent log formatting.
 */
@Appender({ name: "log4js" })
export class Log4jsAppender extends BaseAppender {
    write(event: LogEvent): void {
        const logger = log4js.getLogger("TSED");

        const level = event.level?.toString()?.toLowerCase?.()
            ?? event.level?.levelStr?.toLowerCase?.()
            ?? "info";

        const data = Array.isArray(event.data)
            ? event.data
            : [event.data];

        logger.log(level, ...data.filter((item) => item != null));
    }
}