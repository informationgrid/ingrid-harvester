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
import { createEsId } from '../diplanung.utils';
import { Bucket } from '../../../persistence/postgres.utils';
import { DcatApPluDocumentFactory } from '../model/dcatapplu.document.factory';
import { DiplanungIndexDocument } from '../model/index.document';
import { EsOperation } from '../../../persistence/elastic.utils';

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
        let { document, duplicates } = this.prioritizeAndFilter(bucket);
        // data-service-coupling for CSW
        if (document.extras.metadata.source.source_type == 'csw') {
            for (let [id, service] of bucket.operatingServices) {
                document = this.resolveCoupling(document, service);
                document.extras.merged_from.push(createEsId(service));
                box.push({ operation: 'delete', _id: createEsId(service) });
            }
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

    private prioritizeAndFilter(bucket: Bucket): { 
        document: DiplanungIndexDocument, 
        duplicates: Map<string | number, DiplanungIndexDocument>
    } {
        // initialize records map
        let records: Map<string, Map<string | number, DiplanungIndexDocument>> = new Map<string, Map<string | number, DiplanungIndexDocument>>();
        for (let [id, document] of bucket.duplicates) {
            let sourceType = document.extras.metadata.source.source_type;
            let sourceMap = records.get(sourceType);
            if (sourceMap == null) {
                sourceMap = new Map<string | number, DiplanungIndexDocument>();
                records.set(sourceType, sourceMap);
            }
            sourceMap.set(id, document);
        }

        let mainDocument: DiplanungIndexDocument;
        let duplicates: Map<string | number, DiplanungIndexDocument> = new Map<string | number, DiplanungIndexDocument>();
        // prio 1: handle cockpitpro - all other sources are discarded
        if (records.has("cockpitpro")) {
            for (let [id, document] of records.get("cockpitpro")) {
                mainDocument = document;
                break;
            }
        }
        // prio 2: handle cockpit - only keep beteiligungsdb source as duplicate
        else if (records.has("cockpit")) {
            for (let [id, document] of records.get("cockpit")) {
                mainDocument = document;
                break;
            }
            if (records.has("beteiligungsdb")) {
                duplicates = records.get("beteiligungsdb");
            }
        }
        // prio 3: handle beteiligungsdb - all other sources are discarded
        else if (records.has("beteiligungsdb")) {
            for (let [id, document] of records.get("beteiligungsdb")) {
                mainDocument = document;
                break;
            }
        }
        // prio 4: handle csw - only keep wfs sources as duplicates
        else if (records.has("csw")) {
            for (let [id, document] of records.get("csw")) {
                mainDocument = document;
                break;
            }
            if (records.get("wfs")) {
                duplicates = records.get("wfs");
            }
        }
        // prio 5: handle wfs - only keep other wfs sources as duplicates
        else if (records.has("wfs")) {
            for (let [id, document] of records.get("wfs")) {
                if (mainDocument == null) {
                    mainDocument = document;
                }
                else {
                    duplicates.set(id, document);
                }
            }
        }
        // prio 6: handle all other cases - 
        else {
            for (let [id, document] of bucket.duplicates) {
                if (mainDocument == null) {
                    mainDocument = document;
                }
                else {
                    duplicates.set(id, document);
                }
            }
        }

        return { document: mainDocument, duplicates };
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
        switch (document.extras.metadata.source.source_type) {
            case 'cockpitpro':
                return document;
            case 'cockpit':
                if (duplicate.extras.metadata.source.source_type == 'beteiligungsdb') {
                    return { ...document, process_steps: duplicate.process_steps };
                }
                else {
                    return document;
                }
            case 'beteiligungsdb':
                return document;
            case 'csw':
                let updatedFields = {};
                for (const field of overwriteFields) {
                    updatedFields[field] = duplicate[field];
                }
                // use publisher from WFS if not specified in CSW
                if (!document.publisher?.['name'] && !document.publisher?.['organization']) {
                    updatedFields['publisher'] = duplicate.publisher;
                }
                return { ...document, ...updatedFields };
            default:
                return document;
        }
        // TODO don't we need a proper merge?
        // return MiscUtils.merge(document, updatedFields);
    }

    private updateDataset(document: DiplanungIndexDocument): any {
        log.debug(`Updating dataset ${document.identifier} (${document.extras.metadata.source.source_base})`);
        return document;
    }
}
