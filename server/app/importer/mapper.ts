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

import type { ImporterSettings } from './importer.settings.js';
import type { Logger } from 'log4js';
import type { IndexDocumentMetadata } from '../model/index.document.js';
import type { Summary } from '../model/summary.js';

// legacy metadata shape still consumed by the diplanung and lvr profiles
export type MetadataSource = {
    source_base: string,
    source_type: string,
    raw_data_source?: string,
    portal_link?: string,
    attribution?: string
};

/**
 * Base class for all mappers.
 *
 * A mapper is responsible for transforming the data of one harvested record into various formats (@see toMappers).
 * It also provides metadata about the harvested record.
 */
export abstract class Mapper<S extends ImporterSettings> {

    protected errors: string[] = [];
    protected valid = true;
    protected changed = false;
    protected harvestingNotes = [];
    skipped = false;
    abstract log: Logger;
    private blacklistedFormats: string[] = [];

    constructor(readonly settings: S, readonly summary: Summary) {
    }

    init() {
        let hasDataDownloadRule = this.settings && this.settings.rules
            && this.settings.rules.containsDocumentsWithData
            && this.settings.rules.containsDocumentsWithDataBlacklist;

        if (hasDataDownloadRule) {
            this.blacklistedFormats = this.settings.rules.containsDocumentsWithDataBlacklist
                .split(',')
                .map(item => item.trim());
        }
    }


    // only meaningful for CSW records; used to distinguish datasets from services
    getHierarchyLevel(): string {
        return undefined;
    }

    // TODO make abstract, implement in mappers
    getIssued(): Date {
        return null;
    }

    // TODO make abstract, implement in mappers
    getModified(): Date {
        return null;
    }

    /**
     * Base fields for IndexDocumentMetadata, shared across all formats.
     * `data_type` is deliberately left out, since it is profile-specific.
     */
    getBaseMetadata(): Omit<IndexDocumentMetadata, 'data_type'> {
        return {
            created: null,
            modified: this.getModifiedDate()?.toISOString() ?? null,
            issued: this.getIssued()?.toISOString() ?? null,
            partner: this.settings.partner?.split(',').map(p => p.trim())[0],
            provider: this.settings.provider?.split(',').map(p => p.trim())[0],
            datasource: this.settings.dataSourceName
                ? { id: this.settings.dataSourceName, name: this.settings.dataSourceName }
                : undefined,
        };
    }

    // TODO make abstract, implement in mappers - the date the described record was last modified
    getModifiedDate(): Date {
        return undefined;
    }

    abstract getMetadataSourceType(): string;

    // legacy metadata shape still consumed by the diplanung and lvr profiles;
    // not abstract so unrelated mappers aren't forced to implement it
    getMetadataSource(): MetadataSource {
        return undefined;
    }

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

    wktToGeoJson(wkt: string):any{
        try {
            var coordsPos = wkt.indexOf("(");
            var type = wkt.substring(0, coordsPos).trim();
            if(type.lastIndexOf(' ') > -1){
                type = type.substring(type.lastIndexOf(' ')).trim();
            }
            type = type.toLowerCase();
            var coords = wkt.substring(coordsPos).trim();
            coords = coords.replace(/\(/g, "[").replace(/\)/g, "]");
            coords = coords.replace(/\[(\s*[-0-9][^\]]*\,[^\]]*[0-9]\s*)\]/g, "[[$1]]");
            coords = coords.replace(/([0-9])\s*\,\s*([-0-9])/g, "$1], [$2");
            coords = coords.replace(/([0-9])\s+([-0-9])/g, "$1, $2");
            return {
                'type': type,
                'coordinates': JSON.parse(coords)
            };
        } catch(e) {
            this.summary.errors.push({ type: 'app', error: "Can't parse WKT: "+e.message });
        }
    }
}
