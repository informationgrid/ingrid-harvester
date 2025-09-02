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

import {Summary} from './summary.js';

export interface ImportLogMessage {
    id?: number;

    complete?: boolean;

    message?: string;

    summary?: Summary;

    progress?: {
        current: number;
        total: number;
    };

    duration?: number;

    lastExecution?: Date;

    nextExecution?: Date;
}

export class ImportResult {

    static message(message: string) {
        return {
            complete: false,
            message: message
        }
    }

    static running(current: number, total: number, message?: string): ImportLogMessage {
        return {
            complete: false,
            progress: {
                current: current,
                total: total
            },
            message: message ? message : undefined
        };
    }

    static complete(summary: Summary, message?: string): ImportLogMessage {
        return {
            complete: true,
            summary: summary,
            message: message ? message : undefined
        };
    }
}
