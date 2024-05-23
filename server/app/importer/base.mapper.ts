/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import 'dayjs/locale/de';
import { ImporterSettings } from '../importer.settings';
import { Logger } from 'log4js';
import { MetadataSource } from '../model/index.document';
import { Summary } from '../model/summary';

const dayjs = require('dayjs');
dayjs.locale('de');

export abstract class BaseMapper {

    protected dayjs = dayjs;
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

    public abstract getSettings(): ImporterSettings;

    public abstract getSummary(): Summary;

    // async getDistributions(): Promise<Distribution[]>{
    //     if (this.cache.distributions) {
    //         return this.cache.distributions;
    //     }

    //     let distributions = await this._getDistributions();
    //     distributions.forEach(dist => {
    //         if(dist.format){
    //             dist.format = dist.format.filter(format => format && format.trim() !== 'null' && format.trim() !== '');
    //         }
    //         if(!dist.format || dist.format.length === 0){
    //             dist.format = ["Unbekannt"];
    //         }

    //         dist.accessURL = dist.accessURL?.replace(/ /g, '%20');
    //     });

    //     // if (distributions.length === 0) {
    //     //     this.valid = false;
    //     //     let msg = `Dataset has no links for download/access. It will not be displayed in the portal. Title: '${this.getTitle()}', Id: '${this.getGeneratedId()}'.`;

    //     //     this.getSummary().missingLinks++;

    //     //     this.valid = false;
    //     //     this.getSummary().warnings.push(['No links', msg]);

    //     //     this._log.warn(msg);
    //     // }

    //     const isWhitelisted = this.getSettings().whitelistedIds.indexOf(this.getGeneratedId()) !== -1;

    //     if (this.blacklistedFormats.length > 0) {

    //         if (isWhitelisted) {
    //             this._log.info(`Document is whitelisted and not checked: ${this.getGeneratedId()}`);
    //         } else {
    //             const result = Rules.containsDocumentsWithData(distributions, this.blacklistedFormats);
    //             if (result.skipped) {
    //                 this.getSummary().warnings.push(['No data document', `${this.getTitle()} (${this.getGeneratedId()})`]);
    //                 this.skipped = true;
    //             }
    //             if (!result.valid) {
    //                 this._log.warn(`Document does not contain data links: ${this.getGeneratedId()}`);
    //                 this.valid = false;
    //             }
    //         }
    //     }
    //     this.cache.distributions = distributions;
    //     return distributions;
    // }

    abstract getMetadataSource(): MetadataSource;

    // abstract _isRealtime(): boolean;

    // getAutoCompletion(): string[]{
    //     let title = this.getTitle();
    //     let parts = title.split(/[^a-zA-Z0-9\u00E4\u00F6\u00FC\u00C4\u00D6\u00DC\u00df]/).filter(s => s.length >= 3).filter(s => s.match(/[a-zA-Z]/));

    //     let keywords = this.getKeywords()
    //     if(keywords != undefined)
    //         parts = parts.concat(keywords.filter(s => s.length >= 3));

    //     return parts;
    // }

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
