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

import * as fs from 'fs';
import * as path from 'path';
import {Service} from '@tsed/di';

@Service()
export class LogService {
    get(): string {
        return fs.readFileSync('logs/app.log', "utf8");
    }

    getHarvesterLog(harvesterId: number, jobId: string): string {
        if (!/^\d+$/.test(String(harvesterId)) || !/^[a-f0-9-]+$/i.test(jobId)) {
            throw new Error('Invalid harvesterId or jobId');
        }
        const logPath = path.resolve('logs/harvester', String(harvesterId), `${jobId}.log`);
        const baseDir = path.resolve('logs/harvester');
        if (!logPath.startsWith(baseDir + path.sep)) {
            throw new Error('Invalid log path');
        }
        return fs.readFileSync(logPath, 'utf8');
    }
}
