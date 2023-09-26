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
import { DcatApPluDocument } from '../model/dcatApPlu.document';
import { DiplanungCswMapper } from '../mapper/diplanung.csw.mapper';
import { DiplanungUtils } from '../diplanung.utils';
import { DiplanungVirtualMapper } from '../mapper/diplanung.virtual.mapper';
import { Distribution } from '../../../model/distribution';
import { GeoJsonUtils } from '../../../utils/geojson.utils';
import { Geometry, GeometryCollection, Point } from '@turf/helpers';
import { MiscUtils } from '../../../utils/misc.utils';
import { PluPlanType } from '../../../model/dcatApPlu.model';
import { RequestDelegate } from '../../../utils/http-request.utils';
import { WmsXPath } from './wms.xpath';

const log = require('log4js').getLogger(__filename);
const WMS_PARAMS = ['service', 'request', 'version'];

export class DiplanungCswImporter extends CswImporter {

    private static readonly MAX_TRIES = 5;
    private static readonly SKIPPED_EXTENTSIONS = ['.jpg', '.html', '.pdf', '.png', '/'];

    private tempUrlCache = new Map<string, string[]>();

    getMapper(settings, record, harvestTime, storedData, summary, generalInfo): DiplanungCswMapper {
        return new DiplanungCswMapper(settings, record, harvestTime, storedData, summary, generalInfo);
    }

    /**
     * IDEA: After harvesting datasets and services (not even necessarily in that order)
     *
     * 1) save operatesOn for all services
     * 2) save own ID in operatesOn for datasets
     * 3) aggregate over operatesOn (datasets + services)
     * 4) merge distributions on dataset (which has _id == operatesOn)
     *
     * Current implementation:
     * 1) save operatesOn for all services
     * 2) (skip)
     * 3) aggregate over operatesOn (services)
     * 4) get dataset which has _id == operatesOn separately
     * 5) merge on it
     *
     * We skip 2 because we have to retrieve the dataset in 4 separately.
     * We have to retrieve the dataset separately because we cannot retrieve the full documents in the aggregation
     * (due to memory limitations).
     * We need to retrieve the whole dataset document because after the merge, we have to recreate the DCAT-AP-PLU
     * xml fragment.
     *
     * A way around the last step - to be more close to the original idea, saving a roundtrip - would be to just
     * retrieve the dcat-ap-plu document of the dataset and replacing all distributions with the newly merged set.
     * TODO This is left as an exercise to the reader :)
     */
    protected async postHarvestingHandling() {
        await this.createDataServiceCoupling();
    }

    private async createDataServiceCoupling() {
        try {
            let response = await this.elastic.search(
                this.elastic.indexName,
                this.profile.getElasticQueries().findSameOperatesOn(),
                50
            );

            log.debug(`Count of buckets for data-service-coupling aggregates query: ${response.aggregations.operatesOn.buckets.length}`);
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
                    let datasetHasWMS = false;
                    for (let dist of dataset._source.distributions) {
                        distributions[MiscUtils.createDistHash(dist)] = dist;
                        if (dist.format.includes('WMS')) {
                            datasetHasWMS = true;
                        }
                    }
                    let serviceIds = [];
                    for (let hit of hits) {
                        for (let dist of hit._source.distributions) {
                            if (dist.format.includes('WMS')) {
                                if (datasetHasWMS) {
                                    continue;
                                }
                                else {
                                    // only use the first WMS distribution we get from services
                                    // TODO this is arbitrary, should there be an order? should there be multiple?
                                    datasetHasWMS = true;
                                }
                            }
                            distributions[MiscUtils.createDistHash(dist)] = dist;
                        }
                        serviceIds.push(hit._id);
                    }
                    distributions = Object.values(distributions);

                    // create new dcat-ap-plu xml document from merged index document
                    let mergedDoc = {
                        ...dataset._source,
                        distributions
                    };
                    let dcatappluDocument = await DcatApPluDocument.create(new DiplanungVirtualMapper(mergedDoc));
                    let updateDoc = {
                        _id: uuid,
                        distributions,
                        extras: { ...dataset._source.extras, transformed_data: { dcat_ap_plu: dcatappluDocument } }
                    };

                    let servicesMsg = `Services which operate on dataset -> ${serviceIds}`;
                    let datasetMsg = `Concerned dataset -> ${uuid}'`;
                    log.trace(`Distributions from services are merged into dataset in index ${this.elastic.indexName}.\n        ${servicesMsg}\n        ${datasetMsg}`);
                    await this.elastic.addDocsToBulkUpdate([updateDoc]);
                }
                catch (err) {
                    log.warn(`Error creating data-service coupling for dataset ${bucket.key}`, err);
                }
            }
            // log.info(`${count} duplicates found using the aggregates query will be deleted`);
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

    protected async updateRecords(documents: any[]) {
        log.debug('Updating #records:', documents.length);
        let promises: Promise<any>[] = [];
        for (let doc of documents) {
            promises.push(new Promise(async (resolve, reject) => {
                let updateDoc = {
                    _id: doc.identifier
                };
                let docIsUpdated = false;

                // update WMS distributions with layer names
                let updatedDistributions = await this.updateDistributions(doc.distributions, doc.plan_type as PluPlanType);
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

                // purposely simplistic heuristic: is centroid inside bbox for Germany?
                if (!GeoJsonUtils.within(doc.centroid, GeoJsonUtils.BBOX_GERMANY)) {
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
                        updateDoc['extras']['metadata']['quality_notes'].push('Centroid not within Germany');
                    }
                    docIsUpdated = true;
                }

                if (docIsUpdated) {
                    resolve(updateDoc);
                }
                else {
                    reject(`Not updating document ${doc.identifier}`);
                }
            }));
        }
        let results = (await Promise.allSettled(promises)).filter(result => result.status === 'fulfilled');
        let updateDocs = (results as PromiseFulfilledResult<any>[]).map(result => result.value);
        await this.elastic.addDocsToBulkUpdate(updateDocs);
    }

    /**
     * Add layer names to the given distributions that can be deduced to point to a WMS.
     * 
     * @param distributions the distributions to potentially retrieve WMS layer names for
     * @returns all distributions, including the modified ones if any; null, if no distribution was modified
     */
    private async updateDistributions(distributions: Distribution[], planType: PluPlanType): Promise<Distribution[]> {
        let updatedDistributions: Distribution[] = [];
        let generatedIdx = null;
        let updated = false;
        for (let distribution of distributions) {
            let accessURL_lc = distribution.accessURL.toLowerCase();
            let baseUrl = getBaseUrl(accessURL_lc);
            // short-circuits
            if (this.tempUrlCache.get(baseUrl)?.length > DiplanungCswImporter.MAX_TRIES) {
                this.tempUrlCache.get(baseUrl).push(accessURL_lc);
                continue;
            }
            // Hamburg Customization -> enrich dataset with WMS Distribution
            let generatedWMS = this.generateWmsDistribution(distribution, planType);
            if (generatedWMS) {
                updatedDistributions.push(generatedWMS);
                generatedIdx = updatedDistributions.length - 1;
                updated = true;
            }
            if (DiplanungCswImporter.SKIPPED_EXTENTSIONS.some(ext => accessURL_lc.endsWith(ext))) {
                updatedDistributions.push(distribution);
                continue;
            }
            if (distribution.format?.includes('WMS') || accessURL_lc.includes('wms')) {
                let accessURL: URL = new URL(distribution.accessURL);
                let cleanedURL = cleanWmsUrl(accessURL);
                if (distribution.accessURL != cleanedURL) {
                    updated = true;
                }
                distribution.accessURL = cleanedURL;
                distribution.format = ['WMS'];

                accessURL.searchParams.append('service', 'WMS');
                accessURL.searchParams.append('request', 'GetCapabilities');
                let response;
                try {
                    response = await RequestDelegate.doRequest({ uri: accessURL.toString(), accept: 'text/xml' });
                }
                catch (err) {
                    let msg = `Could not parse response from ${accessURL.toString()}`;
                    log.warn(msg);
                    this.summary.warnings.push([msg, err.message]);
                }
                // surface heuristic for XML
                if (response == null) {
                    let msg = `Content-Type for ${accessURL.toString()} was not "text/xml", skipping`;
                    log.debug(msg);
                    // this.summary.warnings.push([msg]);
                }
                else if (response.startsWith('<?xml')) {
                    try {
                        let layerNames = this.getMapLayerNames(response);
                        this.tempUrlCache.set(baseUrl, []);
                        if (layerNames) {
                            distribution.mapLayerNames = layerNames;
                            updated = true;
                        }
                    }
                    catch (err) {
                        let msg = `Could not parse response from ${accessURL.toString()}`;
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
                    this.summary.warnings.push([msg, MiscUtils.truncateErrorMessage(response.replaceAll('\n', ' '), 1024)]);
                }
            }
            updatedDistributions.push(distribution);
        }
        // if we have generated a WMS, remove other, now superfluous WMS
        if (generatedIdx != null) {
            updatedDistributions = updatedDistributions.filter((dist, idx) => idx == generatedIdx || !dist.format.includes('WMS'));
        }
        return updated ? updatedDistributions : null;
    }

    private generateWmsDistribution(distribution: Distribution, planType: PluPlanType): Distribution {
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
            return DiplanungUtils.generateXplanWmsDistribution(stateAbbrev, planName, planType);
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

function cleanWmsUrl(accessURL: URL): string {
    // clean standard WMS params from WMS URL
    let markedForDeletion = [];
    for (const key of accessURL.searchParams.keys()) {
        if (WMS_PARAMS.includes(key.toLowerCase())) {
            markedForDeletion.push(key);
        }
    }
    markedForDeletion.forEach(key => accessURL.searchParams.delete(key));
    return MiscUtils.strip(accessURL.toString(), '?');
}
