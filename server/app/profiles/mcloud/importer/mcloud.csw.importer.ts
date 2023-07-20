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

import { CswImporter } from '../../../importer/csw/csw.importer';
import { MiscUtils } from '../../../utils/misc.utils';
import { ProfileFactoryLoader } from '../../../profiles/profile.factory.loader';
import { RequestDelegate } from '../../../utils/http-request.utils';

const log = require('log4js').getLogger(__filename);

export class McloudCswImporter extends CswImporter {
    constructor(settings, requestDelegate?: RequestDelegate) {
        super(settings, requestDelegate)
    }

    protected async postHarvestingHandling(){
        this.createDataServiceCoupling();
    }

    private async createDataServiceCoupling() {
        try {
            let response = await this.elastic.search(
                this.elastic.indexName,
                ProfileFactoryLoader.get().getElasticQueries().findSameOperatesOn(),
                50
            );

            log.debug(`Count of buckets for deduplication aggregates query: ${response.aggregations.operatesOn.buckets.length}`);
            for (let bucket of response.aggregations.operatesOn.buckets) {
                try {
                    let hits = bucket.operatesOn.hits.hits;
                    let uuid = bucket.key;
                    let dataset = await this.elastic.get(this.elastic.indexName, uuid);

                    // if we don't have the dataset on which services operatesOn, skip
                    if (!dataset) {
                        continue;
                    }

                    // merge all distributions from the operating services into the dataset
                    let distributions = {};
                    for (let dist of dataset._source.distributions) {
                        distributions[MiscUtils.createDistHash(dist)] = dist;
                    }
                    let serviceIds = [];
                    for (let hit of hits) {
                        for (let dist of hit._source.distributions) {
                            distributions[MiscUtils.createDistHash(dist)] = dist;
                        }
                        serviceIds.push(hit._id);
                    }
                    distributions = Object.values(distributions);

                    let updateDoc = {
                        _id: uuid,
                        distributions,
                    };

                    let servicesMsg = `Services which operate on dataset -> ${serviceIds}`;
                    let datasetMsg = `Concerned dataset -> ${uuid}'`;
                    log.info(`Distributions from services are merged into dataset in index ${this.elastic.indexName}.\n        ${servicesMsg}\n        ${datasetMsg}`);
                    await this.elastic.addDocsToBulkUpdate([updateDoc]);
                }
                catch (err) {
                    log.warn(`Error creating data-service coupling for dataset ${bucket.key}`, err);
                }
            }
        } catch (err) {
            log.error('Error executing the aggregate query for data-service coupling', err);
        }

        // push remaining updates
        await this.elastic.sendBulkUpdate(false);

        try {
            await this.elastic.flush();
        } catch (e) {
            log.error('Error occurred during flush', e);
        }
    }
}
