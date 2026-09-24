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
import type { IngridOpendataDeprecatedIndexDocument } from "../model/opendataindex.document.deprecated.js";
import { ingridMapper } from './ingrid.mapper.js';
import { Codelist } from "../utils/codelist.js";

const log = log4js.getLogger(import.meta.filename);

export class ingridCkanMapper extends ingridMapper<CkanMapper> {

    protected getDefaultDocumentKind(): 'ingrid' | 'opendata' {
        return 'opendata';
    }

    protected override getDocumentBuilders() {
        return {
            ...super.getDocumentBuilders(),
            'opendata-deprecated': () => this.buildOpendataDeprecatedDocument(),
        };
    }

    // the pre-migration ("opendata") document shape - see IngridOpendataDeprecatedIndexDocument for
    // context. Mirrors main's (still-unmigrated) createIndexDocument() as closely as possible, reusing
    // what's still alive/unchanged (getKeywords) and reintroducing only what genuinely changed for the
    // new shape (contacts: numeric IGC role codes instead of role names; distributions/spatial: old
    // field layout instead of the new one).
    private async buildOpendataDeprecatedDocument(): Promise<IngridOpendataDeprecatedIndexDocument> {
        const settings = this.baseMapper.settings;
        let result: IngridOpendataDeprecatedIndexDocument = {
            ...this.getCustomEntries(),
            iPlugId: settings.iPlugId,
            partner: settings.partner?.split(',').map(p => p.trim()),
            provider: settings.provider?.split(',').map(p => p.trim()),
            organisation: this.transformToIgcDomainId(settings.provider, "111"),
            datatype: settings.datatype?.split(',').map(p => p.trim()) ?? ["default"],
            dataSourceName: settings.dataSourceName,
            boost: settings.boost,
            isfolder: "false",
            metadata: {
                created: null,
                modified: this.getModifiedDate(),
            },
            id: this.getGeneratedId(),
            uuid: this.getGeneratedId(),
            modified: this.getModifiedDate(),
            collection: {
                name: settings.dataSourceName,
            },
            extras: {
                metadata: {
                    harvested: this.baseMapper.getHarvestingDate(),
                    harvesting_errors: null,
                    issued: null,
                    is_valid: null,
                    modified: null,
                    source: this.baseMapper.getMetadataSource(),
                    merged_from: []
                }
            },
            sort_hash: this.getSortUuid(),
            content: null, // assigned after
            rdf: null, // assigned after
            t01_object: {
                obj_id: this.getGeneratedId()
            },
            title: this.getTitle(),
            description: this.baseMapper.getDescription(),
            dcat: {
                landingPage: null,
            },
            contacts: this.getContactsDeprecated(),
            keywords: this.getKeywords().map(keyword => ({ id: null, ...keyword })),
            legal_basis: null,
            // getDistributions() was retyped for the new shape (IngridOpendataDistribution) - bypass
            // it and go straight to the base importer mapper, matching the old field layout.
            distributions: await this.baseMapper.getDistributions(),
            political_geocoding_level_uri: null,
            spatial: this.getOldSpatial(),
            temporal: {
                "accrual_periodicity": "",
                "accrual_periodicity_key": ""
            },
        };
        result.content = this.getContent(result);
        // add "rdf" at the end, so it does not get included in the "content" array
        result.rdf = await this.baseMapper.getDcatapde();
        return result;
    }

    private getContactsDeprecated(): any[] {
        const withRole = (role: string) => (contact: any) => ({ role: this.getRoleId(role), ...contact });
        return [
            ...this.baseMapper.getPublisher().map(withRole("publisher")),
            ...this.baseMapper.getCreatorDeprecated().map(withRole("creator")),
            ...this.baseMapper.getMaintainer().map(withRole("maintainer")),
            ...this.baseMapper.getOriginator().map(withRole("originator")),
        ];
    }

    private getRoleId(role: string) {
        switch (role) {
            case "publisher": return 10;
            case "creator": return 11;
            case "maintainer": return 2;
            case "originator": return 6;
        }
        return role;
    }

    private getOldSpatial(): any {
        return { geometries: [this.baseMapper.getSpatial()] };
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
