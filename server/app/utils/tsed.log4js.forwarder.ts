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