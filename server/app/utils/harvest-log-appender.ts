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

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigService } from '../services/config/ConfigService.js';
import { harvestLogContext } from './harvest-log-context.js';

export function configure(config: any, layouts: any) {
    const layout = layouts.basicLayout;
    return (loggingEvent: any) => {
        const ctx = harvestLogContext.getStore();
        if (!ctx) return;
        const dir = path.join('logs', 'harvester', String(ctx.harvesterId));
        fs.mkdirSync(dir, { recursive: true });
        const filePath = path.join(dir, `${ctx.jobId}.log`);
        if (!fs.existsSync(filePath)) {
            pruneOldLogs(dir, ConfigService.getMaxLogsPerHarvester());
        }
        fs.appendFileSync(filePath, layout(loggingEvent) + '\n');
    };
}

export function pruneOldLogs(dir: string, maxLogs: number): void {
    const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.log'))
        .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
        .sort((a, b) => a.mtime - b.mtime);
    for (let i = 0; i < files.length - maxLogs; i++) {
        fs.rmSync(path.join(dir, files[i].name));
    }
}
