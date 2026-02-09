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
import log4js from 'log4js';
import * as xpath from 'xpath';
import type { GeometryInformation, MetadataSource, Temporal } from '../../../model/index.document.js';
import type { Keyword } from '../../../model/ingrid.index.document.js';
import type { Summary } from '../../../model/summary.js';
import type { Media, MediaType, Person, Relation } from '../../../profiles/lvr/model/index.document.js';
import * as MiscUtils from '../../../utils/misc.utils.js';
import type { XPathElementSelect } from '../../../utils/xpath.utils.js';
import { Mapper } from '../../mapper.js';
import { oaiXPaths } from '../oai.paths.js';
import type { OaiSettings } from '../oai.settings.js';

export class OaiMapper extends Mapper<OaiSettings> {

    static select = <XPathElementSelect>xpath.useNamespaces(oaiXPaths.mods.prefixMap);

    private select(xpath: string) {
        return OaiMapper.select(xpath, this.record);
    }

    static text(path: string, parent: Node): string {
        return this.select(path.replace(/\/(?!@)/g, '/mods:'), parent, true)?.textContent;
    }

    log = log4js.getLogger();

    private readonly header: Element;
    public readonly record: Element;
    private harvestTime: any;

    protected readonly idInfo; // : SelectedValue;
    private readonly uuid: string;

    constructor(settings: OaiSettings, header: Element, record: Element, harvestTime, summary: Summary) {
        super(settings, summary);
        this.header = header;
        this.record = record;
        this.harvestTime = harvestTime;

        super.init();
    }

    getId(): string {
        return this.record.getAttribute('ID');
    }

    getTitles() {
        let titleNodes: Element[] = this.select('./mods:titleInfo/mods:title[string-length() > 0]');
        return titleNodes?.map(node => node.textContent);
    }

    getDescriptions() {
        // let abstractNodes: Element[] = this.select('./mods:abstract[string-length() > 0]');
        // return abstractNodes?.map(node => node.textContent);
        let subTitleNodes: Element[] = this.select('./mods:titleInfo/mods:subTitle[string-length() > 0]');
         return subTitleNodes?.map(node => node.textContent);
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
            source: node.getAttribute('authority')
        }));
        return keywords;
    }

    getRelations(): Relation[] {
        let relatedItemNodes = this.select('./mods:relatedItem');
        let relations = relatedItemNodes.map(node => ({
            id: node.getAttribute('xlink:href'),
            type: node.getAttribute('type')
        }));
        return relations;
    }

    getGenres(): string[] {
        let genreNodes = this.select('./mods:genre');
        let genres = genreNodes.map(node => node.textContent).filter(genre => genre);
        return Array.from(new Set(genres));
    }

    getNames(): Person[] {
        let personNodes: Element[] = this.select('./mods:name');
        let persons = personNodes.map(node => ({
            type: node.getAttribute('type') ?? node.getAttribute('oai:type'),
            // role: OaiMapper.text('./role/roleTerm[type="text"]', node),
            role: OaiMapper.select('./mods:role/mods:roleTerm[@type="code"]', node, true)?.textContent,
            name: {
                first: OaiMapper.select('./mods:namePart[@type="given"]', node)?.map(n => n.textContent).join(' '),
                last: OaiMapper.select('./mods:namePart[@type="family"]', node)?.map(n => n.textContent).join(' '),
                display: OaiMapper.text('./displayForm', node),
            }
        }));
        return persons;
    }

    async getLocations(): Promise<Media[]> {
        const getMediaType = (obj: string) => {
            // TODO extend ?
            if (obj?.includes('MCRZipServlet') || obj.includes('MCRFileNodeServlet')) {
                return 'document' as MediaType;
            }
            return '' as MediaType;
        };
        let locationNodes: Element[] = this.select('./mods:location');
        return await Promise.all(locationNodes.map(async location => {
            let mediaURL = OaiMapper.text('./url[@access="object in context"]', location);
            let mediaType = getMediaType(OaiMapper.text('./url[@access="raw object"]', location));
            let media: Media = {
                type: mediaType,
                // TODO decide which one
                url: mediaURL,
                // url: OaiMapper.text('./url[@access="raw object"]', location),
                description: '',
                thumbnail: OaiMapper.text('./url[@access="preview"]', location)
            };
            if (mediaType == 'image') {
                media.dimensions = await MiscUtils.getImageDimensionsFromURL(mediaURL);
            }
            return media;
        }));
    }

    getLicenses() {
        let accessConditionNodes = this.select('./mods:accessCondition');
        let licenses = accessConditionNodes.map(node => ({
            id: null,
            title: node.getAttribute('type'),
            url: node.getAttribute('xlink:href')
        }));
        return licenses;
    }

    getHarvestedData(): string {
        return this.record.toString();
    }

    getHarvestingDate(): Date {
        return new Date(Date.now());
    }

    // TODO
    getIssued(): Date {
        return null;
    }

    getModified(): Date {
        return MiscUtils.normalizeDateTime(OaiMapper.select('./*[local-name()="datestamp"]', this.header, true)?.textContent);
    }

    getMetadataSource(): MetadataSource {
        let link = `${this.getSettings().sourceURL}?verb=GetRecord&metadataPrefix=${this.getSettings().metadataPrefix}&identifier=oai:www.mycore.de:${this.getId()}`;
        return {
            source_base: this.getSettings().sourceURL,
            raw_data_source: link,
            source_type: this.getSettings().metadataPrefix
        };
    }
}
