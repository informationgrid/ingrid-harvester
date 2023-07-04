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

import { overwriteFields } from './elastic.queries';
import { ConfigService } from '../../../services/config/ConfigService';
import { DcatApPluDocument } from '../model/dcatApPlu.document';
import { DeduplicateUtils as AbstractDeduplicateUtils } from '../../../persistence/deduplicate.utils';
import { DiplanungVirtualMapper } from '../mapper/diplanung.virtual.mapper';
import { ElasticsearchUtils } from '../../../persistence/elastic.utils';
import { Summary } from '../../../model/summary';

const log = require('log4js').getLogger(__filename);

export class DeduplicateUtils extends AbstractDeduplicateUtils {

    constructor(elasticUtils: ElasticsearchUtils, summary: Summary) {
        super(elasticUtils, summary);
    }

    // FIXME: deduplication must work differently when import is not started for all harvesters
    async deduplicate() {
        await this._mergeByAlternateTitle('csw_');
    }

    /**
     * Merge metadata from CSW and WFS if IDs match.
     * - base information from CSW (i.e., update CSW index)
     * - overwrite (update) specified fields with WFS data
     * - remove WFS entry after successful merge
     */
    async _mergeByAlternateTitle(mainIndexPrefix: string = 'csw_') {

        mainIndexPrefix = ConfigService.getGeneralSettings().elasticsearch.prefix + mainIndexPrefix;

        // INFO 2 approaches:
        // 1) update in CSW index, remove from WFS index -> update, remove
        // 2) remove in CSW index, remove from WFS index, insert merged into new "merged" index -> remove x2, insert
        //      - ES transform?

        // we'll go with 1) for now
        // first, use update in the CSW index
        // then, remove the document from the WFS index
        try {
            let response = await this.elastic.search(
                this.elastic.config.alias,
                // this.queries.findSameId(),
                this.queries.findSameAlternateTitle(),
                50
            );

            let count = 0;
            log.debug(`Count of buckets for deduplication aggregates query: ${response.aggregations.duplicates.buckets.length}`);
            for (let bucket of response.aggregations.duplicates.buckets) {
                // TODO sort hits by newest metadata modified data
                try {
                    let hits = bucket.duplicates.hits.hits;

                    // the first index starting with mainIndexPrefix is considered the base index
                    let mainHit = hits.find(hit => hit._index.startsWith(mainIndexPrefix));

                    if (!mainHit) {
                        continue;
                    }

                    // merge all hits from other indices into the mainHit, remove them afterwards
                    for (let hit of hits.filter(hit => hit._index != mainHit._index)) {
                        // overwrite predefined fields
                        let updatedFields = {};
                        for (const field of overwriteFields) {
                            updatedFields[field] = hit._source[field];
                        }
                        // use publisher from WFS if not specified in CSW
                        if (!mainHit._source.publisher?.name && !mainHit._source.publisher?.organization) {
                            updatedFields['publisher'] = hit._source.publisher;
                        }

                        // TODO revisit deduplication in general and this bit specifically once the DB layer is done
                        /*
                         * Problem: if we fetch the complete documents in the aggregate query, it becomes too large
                         * very quickly, crashing the query.
                         *
                         * An expensive workaround until the DB layer is incorporated:
                         * get the main hit again (this time fully)
                         */
                        mainHit = await this.elastic.get(mainHit._index, mainHit._id);

                        // create new dcat-ap-plu xml document from merged index document
                        let mergedDoc = { ...mainHit._source, ...updatedFields };
                        let dcatappluDocument = await DcatApPluDocument.create(new DiplanungVirtualMapper(mergedDoc));
                        updatedFields['extras'] = { transformed_data: { dcat_ap_plu: dcatappluDocument } };

                        let deleted = `Item to delete -> ID: '${hit._id}', Title: '${hit._source.title}', Index: '${hit._index}'`;
                        let merged = `Item to merge into -> ID: '${mainHit._id}', Title: '${mainHit._source.title}', Index: '${mainHit._index}'`;
                        log.debug(`Duplicate item found and will be deleted.\n        ${deleted}\n        ${merged}`);
                        this.elastic._bulkData.push(
                            {
                                update: {
                                    _index: mainHit._index,
                                    _type: mainHit._type,
                                    _id: mainHit._id
                                }
                            },
                            {
                                doc: updatedFields
                            },
                            {
                                delete: {
                                    _index: hit._index,
                                    _type: hit._type,
                                    _id: hit._id
                                }
                            }
                        );
                        count++;
                    }
                } catch (err) {
                    this.handleError(`Error deduplicating hits for URL ${bucket.key}`, err);
                }
            }
            log.info(`${count} duplicates found using the aggregates query will be deleted`);
        } catch (err) {
            this.handleError('Error processing results of aggregate query for duplicates', err);
        }

        await this.elastic.sendBulkData(false);

        // TODO: send flush request to immediately remove documents from index
        try {
            await this.elastic.flush();
        } catch (e) {
            log.error('Error occurred during flush', e);
        }
    }

    // FIXME: deduplication must work differently when import is not started for all harvesters
    async _deduplicateByTitle() {
        throw new Error('Method not implemented.');
    }
}
