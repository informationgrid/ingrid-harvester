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
import * as xpath from 'xpath';
import * as MiscUtils from '../../../utils/misc.utils';
import { getLogger } from 'log4js';
import { oaiXPaths } from '../oai.paths';
import { BaseMapper } from '../../base.mapper';
import { GeometryInformation, Keyword, Person, Relation, Temporal } from '../../../profiles/lvr/model/index.document';
import { ImporterSettings } from '../../../importer.settings';
import { MetadataSource } from '../../../model/index.document';
import { OaiSettings } from '../oai.settings';
import { Summary } from '../../../model/summary';
import { XPathElementSelect } from '../../../utils/xpath.utils';

export class OaiMapper extends BaseMapper {

    static select = <XPathElementSelect>xpath.useNamespaces(oaiXPaths.mods.prefixMap);

    private select(xpath: string) {
        return OaiMapper.select(xpath, this.record);
    }

    static text(path: string, parent: Node): string {
        return this.select(path.replace(/\/(?!@)/g, '/mods:'), parent, true)?.textContent;
    }

    static attr(path: string, parent: Node): string {
        return this.select(path.replace(/\/(?!@)/g, '/mods:'), parent, true)?.textContent;
    }

    log = getLogger();

    private readonly header: Element;
    private readonly record: Element;
    private harvestTime: any;

    protected readonly idInfo; // : SelectedValue;
    private settings: OaiSettings;
    private readonly uuid: string;
    private summary: Summary;

    constructor(settings, header: Element, record: Element, harvestTime, summary) {
        super();
        this.settings = settings;
        this.header = header;
        this.record = record;
        this.harvestTime = harvestTime;
        this.summary = summary;

        super.init();
    }

    getId(): string {
        return this.record.getAttribute('ID');
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

    getIssued(): Date {
        return null;
    }

    getModified(): Date {
        return MiscUtils.normalizeDateTime(OaiMapper.select('./*[local-name()="datestamp"]', this.header, true)?.textContent);
    }

    getMetadataSource(): MetadataSource {
        let link = `${this.settings.providerUrl}?verb=GetRecord&metadataPrefix=${this.settings.metadataPrefix}&identifier=oai:www.mycore.de:${this.getId()}`;
        return {
            source_base: this.settings.providerUrl,
            raw_data_source: link,
            source_type: 'mods'
        };
    }

    getTitles() {
        let titleNodes: Element[] = this.select('./mods:titleInfo/mods:title[string-length() > 0]');
        return titleNodes?.map(node => node.textContent);
    }

    getDescriptions() {
        let abstractNodes: Element[] = this.select('./mods:abstract[string-length() > 0]');
        return abstractNodes?.map(node => node.textContent);
    }

    // TODO
    getSpatial(): GeometryInformation[] {
        return null;
    }

    getTemporal(): Temporal[] {
        let originInfoNodes = this.select('./mods:originInfo');
        let temporals = originInfoNodes.map(node => {
            let dateIssuedStart = OaiMapper.select('./mods:dateIssued[@point="start"]', node, true)?.textContent;
            let dateIssuedEnd = OaiMapper.select('./mods:dateIssued[@point="end"]', node, true)?.textContent;
            let dateIssued = OaiMapper.select('./mods:dateIssued[not(@point)]', node, true)?.textContent;
            return {
                date_range: {
                    gte: MiscUtils.normalizeDateTime(dateIssuedStart ?? dateIssued),
                    lte: MiscUtils.normalizeDateTime(dateIssuedEnd ?? dateIssued)
                },
                date_type: node.getAttribute('eventType')
            };
        });
        return temporals;
    }

    getKeywords(): Keyword[] {
        let topicNodes = this.select('./mods:subject/mods:topic');
        let keywords = topicNodes?.map(node => ({
            id: node.getAttribute('valueURI'),
            term: node.textContent,
            thesaurus: node.getAttribute('authority')
        }));
        return keywords;
    }

    getRelations(): Relation[] {
        let relatedItemNodes = this.select('relatedItem');
        let relations = relatedItemNodes.map(node => ({
            id: node.getAttribute('xlink:href'),
            type: node.getAttribute('type'),
            score: null
        }));
        return relations;
    }

    getGenres(): string[] {
        let genreNodes = this.select('./mods:genre');
        return Array.from(new Set(genreNodes.map(node => node.textContent)));
    }

    getNames(): Person[] {
        let personNodes: Element[] = this.select('./mods:name');
        let persons = personNodes.map(node => ({
            // type: OaiMapper.attr('./http://www.openarchives.org/OAI/2.0/:type', node),
            type: OaiMapper.select('./@type', node, true)?.textContent,
            // role: OaiMapper.text('./role/roleTerm[type="text"]', node),
            role: OaiMapper.select('./mods:role/mods:roleTerm[@type="code"]', node, true)?.textContent,
            name: {
                first: OaiMapper.select('./namePart[@type="given"]', node)?.map(n => n.textContent).join(' '),
                last: OaiMapper.select('./namePart[@type="family"]', node)?.map(n => n.textContent).join(' '),
                display: OaiMapper.text('./displayForm', node),
            }
        }));
        return persons;
    }

    getLicenses() {
        let accessConditionNodes = this.select('./mods:accessCondition');
        let licenses = accessConditionNodes.map(node => ({
            id: null,
            title: node.getAttribute('type'),
            url: node.getAttribute('href')
        }));
        return licenses;
    }
}
