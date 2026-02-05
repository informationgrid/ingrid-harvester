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

import type { ImporterSettings } from '../importer.settings.js';
import type { Logger } from 'log4js';
import type { MetadataSource } from '../model/index.document.js';
import type { Summary } from '../model/summary.js';

export abstract class BaseMapper {

    protected readonly settings: ImporterSettings;
    protected summary: Summary;
    protected errors: string[] = [];
    protected valid = true;
    protected changed = false;
    protected harvestingNotes = [];
    skipped = false;
    abstract log: Logger;
    private blacklistedFormats: string[] = [];

    init() {
        let hasDataDownloadRule = this.getSettings() && this.getSettings().rules
            && this.getSettings().rules.containsDocumentsWithData
            && this.getSettings().rules.containsDocumentsWithDataBlacklist;

        if (hasDataDownloadRule) {
            this.blacklistedFormats = this.getSettings().rules.containsDocumentsWithDataBlacklist
                .split(',')
                .map(item => item.trim());
        }
    }

    /**
     * Settings for the current harvesting Job
     */
    public getSettings(): ImporterSettings {
        return this.settings;
    }

    /**
     * Summary of the current harvesting Job (managed by the Importer)
     */
    public getSummary(): Summary{
        return this.summary;
    }

    abstract getMetadataSource(): MetadataSource;

    abstract getHarvestedData(): string;

    abstract getHarvestingDate(): Date;

    getHarvestingErrors() {
        return this.errors.length === 0 ? undefined : this.errors;
    }

    getHarvestingNotes(): string[] {
        return this.harvestingNotes;
    }

    addHarvestingNotes(note: string): void {
        if (!this.harvestingNotes.includes(note)) {
            this.harvestingNotes.push(note);
        }
    }

    isValid() {
        return this.valid;
    }

    setValid(valid: boolean) {
        return this.valid = valid;
    }

    isChanged() {
        return this.changed;
    }

    setChanged(changed: boolean) {
        this.changed = changed;
    }

    shouldBeSkipped() {
        return this.skipped;
    }

    executeCustomCode(doc: any) {}
}
