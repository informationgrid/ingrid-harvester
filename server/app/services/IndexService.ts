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

import * as fs from "fs";
import { BulkResponse, ElasticsearchUtils} from '../persistence/elastic.utils';
import { ConfigService} from './config/ConfigService';
import { ElasticsearchFactory } from '../persistence/elastic.factory';
import { Index} from '@shared/index.model';
import { Service} from '@tsed/di';
import { Summary} from '../model/summary';

let log = require('log4js').getLogger(__filename);
var path = require('path');
const zlib = require('zlib');
const Readable = require('stream').Readable

@Service()
export class IndexService {

    private alias: string;
    private elasticUtils: ElasticsearchUtils;

    constructor() {
        this.initialize();
    }

    /**
     * Start all cron jobs configured in each harvester
     */
    initialize() {
        let elasticsearchConfiguration = ConfigService.getGeneralSettings().elasticsearch;
        let config = {
            ...elasticsearchConfiguration,
            includeTimestamp: true,
            index: ''
        };
        this.alias = elasticsearchConfiguration.alias;
        // @ts-ignore
        const summary: Summary = {elasticErrors: []};
        this.elasticUtils = ElasticsearchFactory.getElasticUtils(config, summary);
    }

    async addToAlias(id: number) {
        const index = await this.getIndexFromHarvesterID(id);

        if (index) {
            return this.elasticUtils.addAlias(index, this.alias);
        }
    }

    async removeFromAlias(id: number) {
        const index = await this.getIndexFromHarvesterID(id);
        if (index) {
            return this.elasticUtils.removeAlias(index, this.alias);
        }
    }

    private async getIndexFromHarvesterID(id: number): Promise<string> {
        const harvester = ConfigService.get().find(h => h.id === id);
        let indices = await this.elasticUtils.getIndicesFromBasename(harvester.index);

        // if multiple indices, then there might be an indexing process
        // we should be able to ignore adding an alias, since it should happen automatically after indexing
        if (indices.length !== 1) {
            log.warn('The index cannot be identified by its basename in a unique name ' + JSON.stringify(indices));
            log.warn('Is there a harvest going on, where a temporary new index is created?');
            return null;
        }
        return indices[0].name;
    }

    async getIndices(): Promise<Index[]> {
        return await this.elasticUtils.getIndicesFromBasename('')
    }

    deleteIndex(name: string) {
        this.elasticUtils.deleteIndex(name);
    }

    async deleteIndexFromHarvester(id: number) {
        const indexName = await this.getIndexFromHarvesterID(id);
        this.elasticUtils.deleteIndex(indexName);
    }

    async search(indexName: string): Promise<any> {
        const response = await this.elasticUtils.search(indexName);
        return response.hits.hits;
    }

    async exportIndex(name: string): Promise<any> {
        let settings = await this.elasticUtils.getIndexSettings(name);
        let mapping = await this.elasticUtils.getIndexMapping(name);
        let data = await this.elasticUtils.getAllEntries(name);

        return {
            index: name,
            settings: {
                number_of_shards: settings[name].settings.index.number_of_shards,
                number_of_replicas: settings[name].settings.index.number_of_replicas,
                analysis: settings[name].settings.index.analysis
            },
            mappings: mapping[name].mappings,
            data: data
        }
    }

    async saveIndices(pattern: string, dir: string) {
        log.info("Create Backup of Indices! Pattern: /"+pattern+"/i")
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir)
        }
        let regExp = new RegExp(pattern, "i");
        this.getIndices().then(indices => {
            indices.filter(index => index.name.match(regExp))
                .forEach(index =>
                    this.exportIndex(index.name).then(json => {
                        let file = path.join(dir, index.name + ".json.gz");
                        let writeStream = fs.createWriteStream(file);

                        let s = new Readable({read(size) {
                                this.push(JSON.stringify(json, null, 2))
                                this.push(null)
                            }});

                        const zip = zlib.createGzip();
                        s.pipe(zip).pipe(writeStream);

                    }));
        });
    }

    async importIndex(json: any): Promise<any> {
        //let settings = json.settings;
        //let mapping = await this.elasticUtils.getIndexMapping(name);
        //let data = await this.elasticUtils.getAllEntries(name);

        await this.elasticUtils.prepareIndexWithName(json.index, json.mappings, json.settings);
        let bulkData = [];
        let type = Object.keys(json.mappings)[0];
        let promise = new Promise<void | BulkResponse>(resolve => {
            resolve()
        });
        json.data.forEach(entry => {
            bulkData.push({
                index: {
                    _id: entry._id
                }
            });
            bulkData.push(entry._source)

            if (bulkData.length >= (ElasticsearchUtils.maxBulkSize * 2)) {
                let data = [];
                bulkData.forEach(entry => data.push(entry));
                bulkData = [];
                promise = promise.then(() => this.elasticUtils.bulkWithIndexName(json.index, type, data, false));

            }
        });
        return await promise
            .then(() => this.elasticUtils.bulkWithIndexName(json.index, type, bulkData, false))
            .then(() => this.elasticUtils.health('yellow'));
    }
}
