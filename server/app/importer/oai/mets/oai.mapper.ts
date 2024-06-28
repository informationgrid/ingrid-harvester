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

/**
 * A mapper for METS/MODS XML documents harvested over OAI.
 */
import * as cxml from 'cxml';
import * as xpath from 'xpath';
import * as ModsModel from './xmlns/www.loc.gov/mods/v3';
import { getLogger } from 'log4js';
import { oaiXPaths } from '../oai.paths';
import { BaseMapper } from '../../base.mapper';
import { ImporterSettings } from '../../../importer.settings';
import { MetadataSource } from '../../../model/index.document';
import { OaiSettings } from '../oai.settings';
import { Summary } from '../../../model/summary';
import { XPathElementSelect } from '../../../utils/xpath.utils';

export class OaiMapper extends BaseMapper {

    static select = <XPathElementSelect>xpath.useNamespaces(oaiXPaths.mods.prefixMap);

    static text(path: string, parent: Node): string {
        return this.select(path.replace(/\/(?!@)/g, '/mods:'), parent, true)?.textContent;
    }

    static attr(path: string, parent: Node): string {
        return this.select(path.replace(/\/(?!@)/g, '/mods:'), parent, true)?.textContent;
    }

    log = getLogger();

    private readonly record: any;
    private harvestTime: any;
    private metsDocument: ModsModel.modsDefinition;

    protected readonly idInfo; // : SelectedValue;
    private settings: OaiSettings;
    private readonly uuid: string;
    private summary: Summary;

    constructor(settings, record, harvestTime, summary) {
        super();
        this.settings = settings;
        this.record = record;
        this.harvestTime = harvestTime;
        this.summary = summary;

        super.init();
    }

    async init(): Promise<void> {
        let parser = new cxml.Parser();
        this.metsDocument = (await parser.parse(this.record.toString(), ModsModel.document)).mods;
        let i = 0;
    }

    getId(): string {
        return this.metsDocument.ID;
    }

    getMetsDocument(): ModsModel.modsDefinition {
        return this.metsDocument;
    }
    
    getSettings(): ImporterSettings {
        return this.settings;
    }

    getSummary(): Summary {
        return this.summary;
    }

    getHarvestedData(): string {
        return this.record.toString();
    }

    getHarvestingDate(): Date {
        return new Date(Date.now());
    }

    getMetadataSource(): MetadataSource {
        let link = `${this.settings.providerUrl}?verb=GetRecord&metadataPrefix=mets&identifier=${this.getId()}`;
        return {
            source_base: this.settings.providerUrl,
            raw_data_source: link,
            source_type: 'mets'
        };
    }
}
