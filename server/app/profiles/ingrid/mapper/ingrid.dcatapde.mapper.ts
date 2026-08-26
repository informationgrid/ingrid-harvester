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

import turfBbox from '@turf/bbox';
import log4js from 'log4js';
import { DcatapdeMapper } from "../../../importer/dcatapde/dcatapde.mapper.js";
import type { IndexContact, IndexSpatial } from '../../../model/index.document.js';
import type { IngridOpendataDistribution } from "../model/opendataindex.document.js";
import { ingridMapper } from './ingrid.mapper.js';
import { Codelist } from "../utils/codelist.js";

const log = log4js.getLogger(import.meta.filename);

export class ingridDcatapdeMapper extends ingridMapper<DcatapdeMapper> {

    protected getDefaultDocumentKind(): 'ingrid' | 'opendata' {
        return 'opendata';
    }

    getDescription(): string {
        return this.baseMapper.getDescription();
    }

    async getRdf(): Promise<string> {
        return "<?xml version='1.0' encoding='UTF-8'?><rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">" + this.getHarvestedData() + "</rdf:RDF>";
    }

    getDcat(): { landing_page?: string } {
        return { landing_page: this.baseMapper.getLandingPage() };
    }

    getLegalBasis(): string {
        return this.baseMapper.getLegalBasis();
    }

    getPoliticalGeocodingLevelUri(): string {
        return this.baseMapper.getPoliticalGeocodingLevelURI();
    }

    getSpatials(): IndexSpatial[] {
        const geometry = this.baseMapper.getSpatial();
        return geometry ? [{ geometry, bbox: turfBbox(geometry) }] : undefined;
    }

    getKeywords() {
        let result = [];
        let keywords = this.baseMapper.getKeywords();
        let themes = this.baseMapper.getThemes();
        keywords?.forEach(keyword => {
            if (this.hasValue(keyword) && !result.some(r => r.term === keyword)) {
                result.push({
                    term: keyword,
                    id: "",
                    source: "FREE",
                });
            }
        });
        themes?.forEach(theme => {
            if (this.hasValue(theme)) {
                theme = theme.substring(theme.lastIndexOf("/") + 1)
                const themeEntry = Codelist.getInstance().getByData("6400", theme)
                if(!result.some(r => r.id === themeEntry.id && r.source === "THEMES")) {
                    result.push({
                        term: themeEntry.value,
                        id: themeEntry.id,
                        source: "THEMES",
                    });
                }
            }
        });
        return result;
    }

    async getContacts(): Promise<IndexContact[]> {
        const toContact = (role: string) => (agent: { name: string, homepage?: string, mbox?: string }): IndexContact => {
            const communications: IndexContact['communications'] = [];
            if (agent.mbox) communications.push({ type: 'email', value: agent.mbox });
            if (agent.homepage) communications.push({ type: 'website', value: agent.homepage });
            return {
                role,
                name: agent.name,
                communications: communications.length ? communications : undefined,
            };
        };
        return [
            ...this.baseMapper.getPublisher().map(toContact('publisher')),
            ...this.baseMapper.getCreator().map(toContact('creator')),
            ...this.baseMapper.getMaintainer().map(toContact('maintainer')),
            ...this.baseMapper.getOriginator().map(toContact('originator')),
        ];
    }

    getIDF() {
        return null;
    }

    async getDistributions(): Promise<IngridOpendataDistribution[]> {
        const distributions = await this.baseMapper.getDistributions();
        // TODO: license/languages from the base Distribution are not forwarded here
        return distributions?.map(d => ({
            format: d.format?.[0],
            access_url: d.accessURL ?? d.access_url,
            modified: d.modified?.toISOString(),
            title: d.title,
            description: d.description,
        }));
    }
}
