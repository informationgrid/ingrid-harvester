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

import { createEsId } from '../diplanung.utils';
import { Bucket } from '../../../persistence/postgres.utils';
import { DcatApPluDocumentFactory } from '../model/dcatapplu.document.factory';
import { EsOperation } from '../../../persistence/elastic.utils';
import { MiscUtils } from '../../../utils/misc.utils';
import { DiplanungIndexDocument } from '../model/index.document';

const log = require('log4js').getLogger(__filename);

const overwriteFields = [
    'catalog',
    // spatial fields
    'bounding_box', 'centroid', 'spatial',
    // PLU fields
    'plan_state', 'plan_type', 'plan_type_fine', 'procedure_start_date', 'procedure_state', 'procedure_type'
];

export class PostgresUtils {

    public async processBucket(bucket: Bucket): Promise<EsOperation[]> {
        let box: EsOperation[] = [];
        // find primary document
        let { primary_id, document, duplicates } = this.prioritize(bucket);
        // data-service-coupling
        for (let [id, service] of bucket.operatingServices) {
            document = this.resolveCoupling(document, service);
            document.extras.merged_from.push(createEsId(service));
            box.push({ operation: 'delete', _id: createEsId(service) });
        }
        // deduplication
        for (let [id, duplicate] of duplicates) {
            let old_id = createEsId(document);
            let duplicate_id = createEsId(duplicate);
            document = this.deduplicate(document, duplicate);
            let document_id = createEsId(document);
            document.extras.merged_from.push(duplicate_id);
            // remove dataset with old_id if it differs from the newly created id
            if (old_id != document_id) {
                box.push({ operation: 'delete', _id: old_id });
            }
            // remove data with duplicate _id if it differs from the newly created id
            if (duplicate_id != document_id) {
                box.push({ operation: 'delete', _id: duplicate_id });
            }
        }
        document = this.updateDataset(document);
        document = MiscUtils.merge(document, { extras: { transformed_data: { dcat_ap_plu: DcatApPluDocumentFactory.create(document) } } });
        box.push({ operation: 'index', _id: createEsId(document), document });
        return box;
    }

    private prioritize(bucket: Bucket): { 
        primary_id: string | number, 
        document: DiplanungIndexDocument, 
        duplicates: Map<string | number, DiplanungIndexDocument>
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
    private resolveCoupling(document: DiplanungIndexDocument, service: DiplanungIndexDocument): DiplanungIndexDocument {
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
    private deduplicate(document: DiplanungIndexDocument, duplicate: DiplanungIndexDocument): DiplanungIndexDocument {
        // log.warn(`Merging ${duplicate.identifier} (${duplicate.extras.metadata.source.source_base}) into ${document.identifier} (${document.extras.metadata.source.source_base})`);
        let updatedFields = {};
        for (const field of overwriteFields) {
            updatedFields[field] = duplicate[field];
        }
        // use publisher from WFS if not specified in CSW
        if (!document.publisher?.['name'] && !document.publisher?.['organization']) {
            updatedFields['publisher'] = duplicate.publisher;
        }
        return { ...document, ...updatedFields };
        // TODO don't we need a proper merge?
        // return MiscUtils.merge(document, updatedFields);
    }

    private updateDataset(document: DiplanungIndexDocument): any {
        log.debug(`Updating dataset ${document.identifier} (${document.extras.metadata.source.source_base})`);
        return document;
    }
}
