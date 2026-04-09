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

import * as chai from 'chai';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pruneOldLogs } from '../../app/utils/harvest-log-appender.js';

const expect = chai.expect;

describe('pruneOldLogs()', function () {

    let tmpDir: string;

    beforeEach(function () {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harvest-log-test-'));
    });

    afterEach(function () {
        fs.rmSync(tmpDir, { recursive: true });
    });

    function createLogFiles(count: number): string[] {
        const files: string[] = [];
        const now = Date.now();
        for (let i = 0; i < count; i++) {
            const name = `job-${String(i).padStart(3, '0')}.log`;
            const filePath = path.join(tmpDir, name);
            fs.writeFileSync(filePath, '');
            // stagger mtimes so oldest = job-000, newest = job-{count-1}
            const mtime = new Date(now + i * 1000);
            fs.utimesSync(filePath, mtime, mtime);
            files.push(name);
        }
        return files;
    }

    it('does nothing when fewer logs than the limit exist', function () {
        createLogFiles(5);
        pruneOldLogs(tmpDir, 10);
        const remaining = fs.readdirSync(tmpDir);
        expect(remaining).to.have.length(5);
    });

    it('does nothing when log count equals the limit', function () {
        createLogFiles(10);
        pruneOldLogs(tmpDir, 10);
        const remaining = fs.readdirSync(tmpDir);
        expect(remaining).to.have.length(10);
    });

    it('deletes the oldest log when count exceeds limit by 1', function () {
        const files = createLogFiles(11);
        pruneOldLogs(tmpDir, 10);
        const remaining = fs.readdirSync(tmpDir);
        expect(remaining).to.have.length(10);
        expect(remaining).to.not.include(files[0]);   // oldest deleted
        expect(remaining).to.include(files[10]);      // newest kept
    });

    it('deletes multiple oldest logs when count exceeds limit by more', function () {
        const files = createLogFiles(13);
        pruneOldLogs(tmpDir, 10);
        const remaining = fs.readdirSync(tmpDir);
        expect(remaining).to.have.length(10);
        expect(remaining).to.not.include(files[0]);   // oldest 3 deleted
        expect(remaining).to.not.include(files[1]);
        expect(remaining).to.not.include(files[2]);
        expect(remaining).to.include(files[12]);      // newest kept
    });

    it('ignores non-.log files when counting and pruning', function () {
        createLogFiles(11);
        fs.writeFileSync(path.join(tmpDir, 'other.txt'), '');
        pruneOldLogs(tmpDir, 10);
        const remaining = fs.readdirSync(tmpDir);
        expect(remaining).to.have.length(11);         // 10 logs + other.txt
        expect(remaining).to.include('other.txt');
    });
});
