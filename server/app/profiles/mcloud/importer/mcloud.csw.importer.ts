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

import * as MiscUtils from '../../../utils/misc.utils';
import { Bucket } from '../../../persistence/postgres.utils';
import { CswImporter } from '../../../importer/csw/csw.importer';
import { EsOperation } from '../../../persistence/elastic.utils';
import { RequestDelegate } from '../../../utils/http-request.utils';

const log = require('log4js').getLogger(__filename);

export class McloudCswImporter extends CswImporter {

    constructor(settings, requestDelegate?: RequestDelegate) {
        super(settings, requestDelegate)
    }

    protected async processBucket(bucket: Bucket<any>): Promise<EsOperation[]> {
        let box: EsOperation[] = [];
        // find primary document
        let { primary_id, document, duplicates } = this.prioritize(bucket);
        // data-service-coupling
        for (let [id, service] of bucket.operatingServices) {
            document = this.resolveCoupling(document, service);
            box.push({ operation: 'delete', _id: id });
        }
        // deduplication
        for (let [id, duplicate] of duplicates) {
            document = this.deduplicate(document, duplicate);
            box.push({ operation: 'delete', _id: id });
        }
        document = this.updateDataset(document);
        box.push({ operation: 'index', _id: primary_id, document });
        return box;
    }

    private prioritize(bucket: Bucket<any>): { 
        primary_id: string | number, 
        document: any, 
        duplicates: Map<string | number, any>
    } {
        let candidates = [];
        let reserveCandidate: string | number;
        for (let [id, document] of bucket.duplicates) {
            if (document.extras.metadata.source.source_base?.endsWith('csw')) {
                candidates.push(id);
            }
            if (id == bucket.anchor_id) {
                reserveCandidate = id;
            }
        }
        if (candidates.includes(reserveCandidate)) {
            candidates = [reserveCandidate];
        }
        else {
            candidates.push(reserveCandidate);
        }

        let document = bucket.duplicates.get(candidates[0]);
        let duplicates = bucket.duplicates;
        duplicates.delete(candidates[0]);
        return { primary_id: candidates[0], document, duplicates };
    }

    /**
     * Resolve data-service coupling. For a given dataset and a given service, merge the service's distributions into
     * the dataset's.
     * 
     * @param document the dataset whose distributions should be extended
     * @param service the service whose distributions should be moved to the dataset
     * @returns the augmented dataset
     */
    private resolveCoupling(document: any, service: any): any {
        let distributions = {};
        for (let dist of document.distributions) {
            distributions[MiscUtils.createDistHash(dist)] = dist;
        }
        for (let dist of service.distributions) {
            distributions[MiscUtils.createDistHash(dist)] = dist;
        }
        return { ...document, distributions: Object.values(distributions) };
    }

    /**
     * Deduplicate datasets across the whole database. For a given dataset and a given duplicate, merge specified
     * properties of the duplicate into the dataset.
     * 
     * @param document 
     * @param duplicate 
     * @returns the augmented dataset
     */
    private deduplicate(document: any, duplicate: any): any {
        return document;
    }

    private updateDataset(document: any): any {
        log.debug(`Updating dataset ${document.identifier} (${document.extras.metadata.source.source_base})`);
        return document;
    }
}
