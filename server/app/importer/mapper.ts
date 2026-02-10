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
import type { HarvestingMetadata, MetadataSource } from '../model/index.document.js';
import type { Summary } from '../model/summary.js';

/**
 * Base class for all mappers.
 * 
 * A mapper is responsible for transforming the data of one harvested record into various formats (@see toMappers).
 * It also provides metadata about the harvested record.
 */
export abstract class Mapper<S extends ImporterSettings> {

    private readonly settings: S;
    private readonly summary: Summary;
    protected errors: string[] = [];
    protected valid = true;
    protected changed = false;
    protected harvestingNotes = [];
    skipped = false;
    abstract log: Logger;
    private blacklistedFormats: string[] = [];

    constructor(settings: S, summary: Summary) {
        this.settings = settings;
        this.summary = summary;
    }

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
     * Settings for the current harvesting Job (proxied from the Importer).
     */
    public getSettings(): S {
        return this.settings;
    }

    /**
     * Summary of the current harvesting Job (managed by the Importer).
     */
    public getSummary(): Summary{
        return this.summary;
    }

    /**
     * Metadata for the managed harvested record
     */
    // public abstract getHarvestingMetadata(): HarvestingMetadata;
    public getHarvestingMetadata(): HarvestingMetadata {
        return {
            deleted: this.getDeleted(),
            harvested: this.getHarvestingDate(),
            harvesting_errors: this.errors,
            issued: this.getIssued(),
            is_changed: this.changed,
            is_valid: this.valid,
            merged_from: [],
            modified: this.getModified(),
            quality_notes: this.harvestingNotes,
            source: this.getMetadataSource(),
        };
    }

    // TODO make abstract, implement in mappers
    getIssued(): Date {
        return null;
    }

    // TODO make abstract, implement in mappers
    getModified(): Date {
        return null;
    }

    getDeleted(): Date {
        return null;
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
