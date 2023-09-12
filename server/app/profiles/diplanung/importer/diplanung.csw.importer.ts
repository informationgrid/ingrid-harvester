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

import { Bucket } from '../../../persistence/postgres.utils';
import { CswImporter } from '../../../importer/csw/csw.importer';
import { DcatApPluDocumentFactory } from '../model/dcatapplu.document.factory';
import { DiplanungCswMapper } from '../mapper/diplanung.csw.mapper';
import { DiplanungIndexDocument } from '../model/index.document';
import { DiplanungUtils } from '../diplanung.utils';
import { Distribution } from '../../../model/distribution';
import { Entity } from '../../../model/entity';
import { EsOperation } from '../../../persistence/elastic.utils';
import { GeoJsonUtils } from '../../../utils/geojson.utils';
import { Geometry, GeometryCollection, Point } from '@turf/helpers';
import { MiscUtils } from '../../../utils/misc.utils';
import { RequestDelegate } from '../../../utils/http-request.utils';
import { WmsXPath } from './wms.xpath';

const log = require('log4js').getLogger(__filename);

const overwriteFields = [
    'catalog',
    // spatial fields
    'bounding_box', 'centroid', 'spatial',
    // PLU fields
    'plan_state', 'plan_type', 'plan_type_fine', 'procedure_start_date', 'procedure_state', 'procedure_type'
];

export class DiplanungCswImporter extends CswImporter {

    private static readonly MAX_TRIES = 5;
    private static readonly SKIPPED_EXTENTSIONS = ['.jpg', '.html', '.pdf', '.png', '/'];

    private tempUrlCache = new Map<string, string[]>();

    getMapper(settings, record, harvestTime, summary, generalInfo): DiplanungCswMapper {
        return new DiplanungCswMapper(settings, record, harvestTime, summary, generalInfo);
    }

    protected async processBucket(bucket: Bucket): Promise<EsOperation[]> {
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
        document = MiscUtils.merge(document, { extras: { transformed_data: { dcat_ap_plu: DcatApPluDocumentFactory.create(document) } } });
        box.push({ operation: 'index', _id: primary_id, document });
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
    }

    private updateDataset(document: DiplanungIndexDocument): any {
        log.debug(`Updating dataset ${document.identifier} (${document.extras.metadata.source.source_base})`);
        return document;
    }

    protected async updateRecords(documents: DiplanungIndexDocument[]) {
        log.warn('Updating #records:', documents.length);
        let promises: Promise<any>[] = [];
        for (let doc of documents) {
            promises.push(new Promise(async (resolve, reject) => {
                let updateDoc = {};
                let docIsUpdated = false;

                // update WMS distributions with layer names
                let updatedDistributions = await this.updateDistributions(doc.distributions);
                if (updatedDistributions?.length > 0) {
                    updateDoc['distributions'] = updatedDistributions;
                    updateDoc['extras'] = { ...doc['extras'] };
                    if (!updateDoc['extras']['metadata']['quality_notes']) {
                        updateDoc['extras']['metadata']['quality_notes'] = [];
                    }
                    updateDoc['extras']['metadata']['is_changed'] = true;
                    updateDoc['extras']['metadata']['quality_notes'].push('WMS layer names have been added to a distribution');
                    docIsUpdated = true;
                }

                // purposely simplistic heuristic: is bbox inside bbox for Germany?
                if (!GeoJsonUtils.within(doc.bounding_box, GeoJsonUtils.BBOX_GERMANY)) {
                    // copy and/or create relevant metadata structure
                    updateDoc['extras'] = { ...doc['extras'] };
                    if (!updateDoc['extras']['metadata']['quality_notes']) {
                        updateDoc['extras']['metadata']['quality_notes'] = [];
                    }
                    // if not, try to swap lat and lon
                    let flippedBbox = GeoJsonUtils.flip<Geometry | GeometryCollection>(doc.bounding_box);
                    if (GeoJsonUtils.within(flippedBbox, GeoJsonUtils.BBOX_GERMANY)) {
                        updateDoc['spatial'] = GeoJsonUtils.flip<Geometry | GeometryCollection>(doc.spatial);
                        updateDoc['bounding_box'] = flippedBbox;
                        updateDoc['centroid'] = GeoJsonUtils.flip<Point>(doc.centroid);
                        updateDoc['extras']['metadata']['is_changed'] = true;
                        updateDoc['extras']['metadata']['quality_notes'].push('Swapped lat and lon');
                    }
                    else {
                        updateDoc['extras']['metadata']['is_valid'] = false;
                        updateDoc['extras']['metadata']['quality_notes'].push('Bounding box not within Germany');
                    }
                    docIsUpdated = true;
                }

                if (docIsUpdated) {
                    // TODO find an efficient postgres way to only send the update instead of te full document
                    // keywords: jsonb_set, json_agg, SQL/JSON Path Language, postgres14+
                    let mergedDocument = MiscUtils.merge(doc, updateDoc);
                    let entity: Entity = {
                        identifier: doc.identifier,
                        source: doc.extras.metadata.source.source_base,
                        collection_id: doc.catalog.identifier,
                        dataset: mergedDocument,
                        raw: undefined
                    };
                    resolve(entity);
                }
                else {
                    reject(`Not updating document ${doc.identifier}`);
                }
            }));
        }
        let results = (await Promise.allSettled(promises)).filter(result => result.status === 'fulfilled');
        let entities = (results as PromiseFulfilledResult<any>[]).map(result => result.value);
        // await this.elastic.addDocsToBulkUpdate(updateDocs);
        for (let entity of entities) {
            await this.database.addEntityToBulk(entity);
        }
    }

    /**
     * Add layer names to the given distributions that can be deduced to point to a WMS.
     * 
     * @param distributions the distributions to potentially retrieve WMS layer names for
     * @returns all distributions, including the modified ones if any; null, if no distribution was modified
     */
    private async updateDistributions(distributions: Distribution[]): Promise<Distribution[]> {
        let updatedDistributions: Distribution[] = [];
        let updated = false;
        for (let distribution of distributions) {
            let accessURL = distribution.accessURL;
            let accessURL_lc = distribution.accessURL.toLowerCase();
            let baseUrl = getBaseUrl(accessURL_lc);
            // short-circuits
            if (this.tempUrlCache.get(baseUrl)?.length > DiplanungCswImporter.MAX_TRIES) {
                this.tempUrlCache.get(baseUrl).push(accessURL_lc);
                continue;
            }
            // Hamburg Customization -> enrich dataset with WMS Distribution
            let generatedWMS = this.generateWmsDistribution(distribution);
            if (generatedWMS) {
                updatedDistributions.push(...generatedWMS);
                updated = true;
            }
            if (DiplanungCswImporter.SKIPPED_EXTENTSIONS.some(ext => accessURL_lc.endsWith(ext))) {
                updatedDistributions.push(distribution);
                continue;
            }
            if (accessURL_lc.includes('request=') && !accessURL_lc.includes('getcapabilities')) {
                updatedDistributions.push(distribution);
                continue;
            }
            if (distribution.format?.includes('WMS') || (accessURL_lc.includes('getcapabilities') && accessURL_lc.includes('wms'))) {
                if (!accessURL_lc.includes('service=wms')) {
                    accessURL += (accessURL.includes('?') ? '&' : '?') + 'service=WMS';
                }
                if (!accessURL_lc.includes('request=getcapabilities')) {
                    accessURL += (accessURL.includes('?') ? '&' : '?') + 'request=GetCapabilities';
                }
                let response;
                try {
                    response = await RequestDelegate.doRequest({ uri: accessURL, accept: 'text/xml' });
                }
                catch (err) {
                    let msg = `Could not parse response from ${accessURL}`;
                    log.warn(msg);
                    this.summary.warnings.push([msg, err.message]);
                }
                // surface heuristic for XML
                if (response?.startsWith('<?xml')) {
                    try {
                        let layerNames = this.getMapLayerNames(response);
                        this.tempUrlCache.set(baseUrl, []);
                        if (layerNames) {
                            distribution.accessURL = accessURL;
                            if (!distribution.format?.includes('WMS')) {
                                distribution.format = [...distribution.format, 'WMS'];
                            }
                            distribution.mapLayerNames = layerNames;
                            updated = true;
                        }
                    }
                    catch (err) {
                        let msg = `Could not parse response from ${accessURL}`;
                        log.debug(msg);
                        this.summary.warnings.push([msg, err.message]);
                    }
                }
                else {
                    // 
                    if (!this.tempUrlCache.has(baseUrl)) {
                        this.tempUrlCache.set(baseUrl, []);
                    }
                    this.tempUrlCache.get(baseUrl).push(accessURL_lc);

                    let msg = `Response for ${accessURL} is not valid XML`;
                    log.debug(msg);
                    this.summary.warnings.push([msg, MiscUtils.truncateErrorMessage(response?.replaceAll('\n', ' '), 1024)]);
                }
            }
            updatedDistributions.push(distribution);
        }
        return updated ? updatedDistributions : null;
    }

    // TODO change this back to one distribution after DiPlanPortal changes
    private generateWmsDistribution(distribution: Distribution): Distribution[] {
        const url: URL = new URL(distribution.accessURL);
        if (url.pathname.endsWith('_WFS_xplan_dls') &&
            url.searchParams.get('service') === 'WFS' &&
            url.searchParams.get('request') === 'GetFeature' && 
            url.searchParams.get('version') === '2.0.0' &&
            url.searchParams.get('resolvedepth') === '*' &&
            url.searchParams.get('StoredQuery_ID') === 'urn:ogc:def:query:OGC-WFS::PlanName'
        ) {
            // generate WMS Url with PlanName form 
            let stateAbbrev = url.pathname.substring(1, 3).toLowerCase();
            let planName = url.searchParams.get('planName');
            return DiplanungUtils.generateXplanWmsDistributions(stateAbbrev, planName);
        } 
        return null;
    }

    private getMapLayerNames(response: string): string[] {
        let serviceResponseDom = this.domParser.parseFromString(response, 'application/xml');
        // layer * 2
        let layers = WmsXPath.select('./wms:WMS_Capabilities/wms:Capability/wms:Layer/wms:Layer', serviceResponseDom);
        let layerNames = [];
        for (let layer of layers) {
            let layerName = WmsXPath.select('./wms:Name', layer, true)?.textContent;
            if (layerName) {
                layerNames.push(layerName);
            }
        }
        return layerNames;
    }
}

function getBaseUrl(url: string) {
    return /(https?:\/\/[^\/]+)\/?.*/.exec(url)?.[1];
}