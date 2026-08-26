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
import { CkanMapper } from "../../../importer/ckan/ckan.mapper.js";
import type { IndexContact, IndexSpatial } from "../../../model/index.document.js";
import type { IngridOpendataDistribution } from "../model/opendataindex.document.js";
import { ingridMapper } from './ingrid.mapper.js';
import { Codelist } from "../utils/codelist.js";

const log = log4js.getLogger(import.meta.filename);

export class ingridCkanMapper extends ingridMapper<CkanMapper> {

    protected getDefaultDocumentKind(): 'ingrid' | 'opendata' {
        return 'opendata';
    }

    getDescription(): string {
        return this.baseMapper.getDescription();
    }

    async getRdf(): Promise<string> {
        return this.baseMapper.getDcatapde();
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
                const themes = theme.split(",").map(term => term.substring(term.lastIndexOf("/") + 1))
                themes.forEach(theme => {
                    const themeEntry = Codelist.getInstance().getByData("6400", theme)
                    if (themeEntry && !result.some(r => r.id === themeEntry.id && r.source === "THEMES")) {
                        result.push({
                            term: themeEntry.value,
                            id: themeEntry.id,
                            source: "THEMES",
                        });
                    }
                });
            }
        });

        // explicitly add "opendata" keyword if not already present
        if (!result.some(keyword => keyword.term.toLowerCase() === 'opendata')) {
            result.push({
                term: 'opendata',
                source: 'FREE'
            });
        }

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

    getSpatials(): IndexSpatial[] {
        const geometry = this.baseMapper.getSpatial();
        if (!geometry) {
            return undefined;
        }
        return [{ geometry, bbox: turfBbox(geometry) }];
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
