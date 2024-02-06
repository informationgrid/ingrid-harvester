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

import { CkanImporter } from '../../../importer/ckan/ckan.importer';
import { CkanMapper } from '../../../importer/ckan/ckan.mapper';
import { DatabaseUtils } from '../../../persistence/database.utils';
import { RecordEntity } from '../../../model/entity';

const log = require('log4js').getLogger(__filename);
const uuidv5 = require('uuid/v5');
const UUID_NAMESPACE = '6891a617-ab3b-4060-847f-61e31d6ccf6f';

export class McloudCkanImporter extends CkanImporter {
    private docsByParent: any[][] = [];

    constructor(settings) {
        super(settings);
    }

    protected posthandlingDocument(mapper: CkanMapper, doc: any){
        let parent = doc.extras?.parent;
        if (this.settings.groupChilds && parent) {
            if (!this.docsByParent[parent]) {
                this.docsByParent[parent] = [];
            }
            this.docsByParent[parent].push(doc);
            mapper.skipped = true;
        }
    }

    protected async postHarvestingHandling(promises: any[]){
        if (Object.keys(this.docsByParent).length > 0) {
            let storedData = await this.database.getStoredData(Object.keys(this.docsByParent).map(key => uuidv5(key, UUID_NAMESPACE)));
            await this.indexGroupedChilds(storedData).then(result => result.forEach(promise => promises.push(promise)));
        }
    }

    private async indexGroupedChilds(storedData){
        if (!this.settings.dryRun) {
            log.info(`Received ${Object.keys(this.docsByParent).length} groups of records by parent`);
            return Object.keys(this.docsByParent).map(key => {
                let docs = this.docsByParent[key];
                let doc = docs[0];
                if (docs.length > 1) {
                    let uuid = uuidv5(key, UUID_NAMESPACE);
                    log.info(`Group ${docs.length} records by parent: ${key} -> ${uuid}`);
                    let child_ids = [doc.extras.generated_id];
                    if(doc.extras.temporal && doc.extras.temporal.length > 0) {
                        for (let j = 0; j < doc.distribution.length; j++) {
                            let distribution = doc.distribution[j];
                            if (doc.extras.temporal && doc.extras.temporal.length > 0) {
                                distribution.temporal = [{
                                    "gte": doc.extras.temporal[0].gte,
                                    "lte": doc.extras.temporal[0].lte
                                }];
                            }
                        }
                    }
                    for (let i = 1; i < docs.length; i++) {
                        let newDoc = docs[i];
                        child_ids.push(newDoc.extras.generated_id);
                        if(newDoc.extras.temporal && newDoc.extras.temporal.length > 0) {
                            for (let j = 0; j < newDoc.distribution.length; j++) {
                                let distribution = newDoc.distribution[j];
                                if (newDoc.extras.temporal && newDoc.extras.temporal.length > 0) {
                                    distribution.temporal = [{
                                        "gte": newDoc.extras.temporal[0].gte,
                                        "lte": newDoc.extras.temporal[0].lte
                                    }];
                                }
                            }
                        }
                        if (newDoc.modified > doc.modified) {
                            if (doc.issued < newDoc.issued) {
                                newDoc.issued = doc.issued;
                            }
                            newDoc.distribution = newDoc.distribution.concat(doc.distribution);
                            if (newDoc.extras.temporal && newDoc.extras.temporal.length > 0 && doc.extras.temporal && doc.extras.temporal.length > 0) {
                                if (doc.extras.temporal[0].gte && (!newDoc.extras.temporal[0].gte || doc.extras.temporal[0].gte < newDoc.extras.temporal[0].gte)) {
                                    newDoc.extras.temporal[0].gte = doc.extras.temporal[0].gte;
                                }
                                if (doc.extras.temporal[0].lte && (!newDoc.extras.temporal[0].lte || doc.extras.temporal[0].lte > newDoc.extras.temporal[0].lte)) {
                                    newDoc.extras.temporal[0].lte = doc.extras.temporal[0].lte;
                                }
                            }
                            doc = newDoc;
                        } else {
                            if (newDoc.issued < doc.issued) {
                                doc.issued = newDoc.issued;
                            }
                            doc.distribution = doc.distribution.concat(newDoc.distribution);
                            if (doc.extras.temporal && doc.extras.temporal.length > 0 && newDoc.extras.temporal && newDoc.extras.temporal.length > 0) {
                                if (newDoc.extras.temporal[0].gte && (!doc.extras.temporal[0].gte || newDoc.extras.temporal[0].gte < doc.extras.temporal[0].gte)) {
                                    doc.extras.temporal[0].gte = newDoc.extras.temporal[0].gte;
                                }
                                if (newDoc.extras.temporal[0].lte && (!doc.extras.temporal[0].lte || newDoc.extras.temporal[0].lte > doc.extras.temporal[0].lte)) {
                                    doc.extras.temporal[0].lte = newDoc.extras.temporal[0].lte;
                                }
                            }
                        }
                    }
                    doc.extras.child_ids = child_ids;
                    doc.extras.generated_id = uuid;
                    //doc.extras.metadata.source.portal_link = this.settings.defaultAttributionLink;
                    doc.title += " (aggregiert)";
                    doc.description  = "Dieser Metadatensatz wurde von der <a href=\"https://www.mcloud.de\">mCLOUD</a> generiert und fasst alle einzelnen Metadatensätze dieser Datenserie zusammen.\r\n\r\n" + doc.description;

                    let stored = storedData.find(element => element.id === uuid);
                    if (stored && stored.issued) {
                        doc.extras.metadata.issued = new Date(stored.issued);
                    } else {
                        doc.extras.metadata.issued = new Date(Date.now());
                    }
                    doc.extras.metadata.modified = new Date();
                    if(stored && stored.modified && stored.dataset_modified){
                        let storedDataset_modified: Date = new Date(stored.dataset_modified);
                        if(storedDataset_modified.valueOf() === doc.modified.valueOf()  )
                            doc.extras.metadata.modified = new Date(stored.modified);
                    }
                }
                let entity: RecordEntity = {
                    identifier: doc.extras.generated_id,
                    source: this.settings.ckanBaseUrl,
                    collection_id: this.database.defaultCatalog.id,
                    dataset: doc,
                    original_document: doc.extras.harvested_data
                };
                return this.database.addEntityToBulk(entity)
                    .then(response => {
                        if (!response.queued) {
                            this.numIndexDocs += DatabaseUtils.maxBulkSize;
                        }
                    }).then(() => this.elastic.health('yellow'));
            });
        }
    }

}
