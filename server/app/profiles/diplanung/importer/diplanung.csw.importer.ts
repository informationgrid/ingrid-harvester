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
import { generateXplanWmsDistributions } from '../diplanung.utils';
import { CswImporter } from '../../../importer/csw/csw.importer';
import { DiplanungIndexDocument } from '../model/index.document';
import { Distribution } from '../../../model/distribution';
import { PluPlanType } from '../../../model/dcatApPlu.model';
import { RecordEntity } from '../../../model/entity';
// import { RequestDelegate } from '../../../utils/http-request.utils';
// import { WmsXPath } from './wms.xpath';

const log = require('log4js').getLogger(__filename);
const WMS_PARAMS = ['service', 'request', 'version'];

export class DiplanungCswImporter extends CswImporter {

    private static readonly MAX_TRIES = 5;
    private static readonly SKIPPED_EXTENTSIONS = ['.jpg', '.html', '.pdf', '.png', '/'];

    private tempUrlCache = new Map<string, string[]>();

    protected async updateRecords(documents: DiplanungIndexDocument[], collectionId: number) {
        log.warn('Updating #records:', documents.length);
        let promises: (() => Promise<RecordEntity>)[] = [];
        for (let doc of documents) {
            promises.push(() => new Promise(async (resolve, reject) => {
                let updateDoc: Partial<DiplanungIndexDocument> = {};
                let docIsUpdated = false;

                // update WMS distributions with layer names
                let updatedDistributions = await this.updateDistributions(doc.distributions, doc.plan_type as PluPlanType);
                if (updatedDistributions?.length > 0) {
                    updateDoc.distributions = updatedDistributions;
                    updateDoc.extras = MiscUtils.merge(MiscUtils.structuredClone(doc.extras), updateDoc.extras);
                    updateQuality(updateDoc, 'WMS layer names have been added to a distribution', null, true);
                    docIsUpdated = true;
                }

                // // purposely simplistic heuristic: is centroid inside bbox for Germany?
                // if (!GeoJsonUtils.within(doc.centroid, GeoJsonUtils.BBOX_GERMANY)) {
                //     // copy and/or create relevant metadata structure
                //     updateDoc.extras = MiscUtils.merge(MiscUtils.structuredClone(doc.extras), updateDoc.extras);
                //     // if not, try to swap lat and lon
                //     let flippedBbox = GeoJsonUtils.flip<Geometry | GeometryCollection>(doc.bounding_box);
                //     if (GeoJsonUtils.within(flippedBbox, GeoJsonUtils.BBOX_GERMANY)) {
                //         updateDoc.spatial = GeoJsonUtils.flip<Geometry | GeometryCollection>(doc.spatial);
                //         updateDoc.bounding_box = flippedBbox;
                //         updateDoc.centroid = GeoJsonUtils.flip<Point>(doc.centroid);
                //         updateQuality(updateDoc, 'Swapped lat and lon', null, true);
                //     }
                //     else {
                //         updateQuality(updateDoc, 'Centroid not within Germany', false, null);
                //     }
                //     docIsUpdated = true;
                // }

                if (docIsUpdated) {
                    // TODO find an efficient postgres way to only send the update instead of the full document
                    // keywords: jsonb_set, json_agg, SQL/JSON Path Language, postgres14+
                    let mergedDocument: DiplanungIndexDocument = MiscUtils.merge(doc, updateDoc);
                    mergedDocument.extras.metadata.modified = new Date(Date.now());
                    let entity: RecordEntity = {
                        identifier: doc.identifier,
                        source: doc.extras.metadata.source.source_base,
                        collection_id: collectionId,
                        dataset: mergedDocument,
                        original_document: undefined
                    };
                    resolve(entity);
                }
                else {
                    reject(`Not updating document ${doc.identifier}`);
                }
            }));
        }
        // // TODO move import somewhere outside
        // // TODO possible with dynamic imports?
        const pLimit = (await import('p-limit')).default; // use dynamic import because this module is ESM-only
        // TODO 10 seems to hit a sweet spot. 20 is already too much with our default fetch timeout of 20sec
        const limit = pLimit(10);
        let results = (await Promise.allSettled(promises.map(pf => limit(pf)))).filter(result => result.status === 'fulfilled');
        let entities = (results as PromiseFulfilledResult<any>[]).map(result => result.value);
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
            let generatedWMS = generateWmsDistribution(distribution, planType);
            if (generatedWMS) {
                updatedDistributions.push(generatedWMS);
                generatedIdx = updatedDistributions.length - 1;
                updated = true;
            }
            if (DiplanungCswImporter.SKIPPED_EXTENTSIONS.some(ext => accessURL_lc.endsWith(ext))) {
                updatedDistributions.push(distribution);
                continue;
            }
            // if (distribution.format?.includes('WMS') || accessURL_lc.includes('wms')) {
            //     let accessURL: URL = new URL(distribution.accessURL);
            //     let cleanedURL = cleanWmsUrl(accessURL);
            //     if (distribution.accessURL != cleanedURL) {
            //         updated = true;
            //     }
            //     distribution.accessURL = cleanedURL;
            //     distribution.format = ['WMS'];

            //     accessURL.searchParams.append('service', 'WMS');
            //     accessURL.searchParams.append('request', 'GetCapabilities');
            //     let response;
            //     try {
            //         response = await RequestDelegate.doRequest({ uri: accessURL.toString(), accept: 'text/xml', timeout: 30000 });
            //     }
            //     catch (err) {
            //         let msg = `Could not parse response from ${accessURL.toString()}`;
            //         log.warn(msg);
            //         this.summary.warnings.push([msg, err.message]);
            //     }
            //     // surface heuristic for XML
            //     if (response == null) {
            //         let msg = `Content-Type for ${accessURL.toString()} was not "text/xml", skipping`;
            //         log.debug(msg);
            //         // this.summary.warnings.push([msg]);
            //     }
            //     else if (response.startsWith('<?xml')) {
            //         try {
            //             let layerNames = this.getMapLayerNames(response);
            //             this.tempUrlCache.set(baseUrl, []);
            //             if (layerNames) {
            //                 distribution.mapLayerNames = layerNames;
            //                 updated = true;
            //             }
            //         }
            //         catch (err) {
            //             let msg = `Could not parse response from ${accessURL.toString()}`;
            //             log.debug(msg);
            //             this.summary.warnings.push([msg, err.message]);
            //         }
            //     }
            //     else {
            //         // 
            //         if (!this.tempUrlCache.has(baseUrl)) {
            //             this.tempUrlCache.set(baseUrl, []);
            //         }
            //         this.tempUrlCache.get(baseUrl).push(accessURL_lc);

            //         let msg = `Response for ${accessURL} is not valid XML`;
            //         log.debug(msg);
            //         this.summary.warnings.push([msg, MiscUtils.truncateErrorMessage(response?.replaceAll('\n', ' '), 1024)]);
            //     }
            // }
            updatedDistributions.push(distribution);
        }
        // if we have generated a WMS, remove other, now superfluous WMS
        if (generatedIdx != null) {
            updatedDistributions = updatedDistributions.filter((dist, idx) => idx == generatedIdx || !dist.format.includes('WMS'));
        }
        return updated ? updatedDistributions : null;
    }

    // private getMapLayerNames(response: string): string[] {
    //     let serviceResponseDom = this.domParser.parseFromString(response, 'application/xml');
    //     // layer * 2
    //     let layers = WmsXPath.select('./wms:WMS_Capabilities/wms:Capability/wms:Layer/wms:Layer', serviceResponseDom);
    //     let layerNames = [];
    //     for (let layer of layers) {
    //         let layerName = WmsXPath.select('./wms:Name', layer, true)?.textContent;
    //         if (layerName) {
    //             layerNames.push(layerName);
    //         }
    //     }
    //     return layerNames;
    // }
}

function getBaseUrl(url: string) {
    return /(https?:\/\/[^\/]+)\/?.*/.exec(url)?.[1];
}

// function cleanWmsUrl(accessURL: URL): string {
//     // clean standard WMS params from WMS URL
//     let markedForDeletion = [];
//     for (const key of accessURL.searchParams.keys()) {
//         if (WMS_PARAMS.includes(key.toLowerCase())) {
//             markedForDeletion.push(key);
//         }
//     }
//     markedForDeletion.forEach(key => accessURL.searchParams.delete(key));
//     return MiscUtils.strip(accessURL.toString(), '?');
// }

function generateWmsDistribution(distribution: Distribution, planType: PluPlanType): Distribution {
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
        return generateXplanWmsDistributions(stateAbbrev, planName, planType);
    } 
    return null;
}

function updateQuality(document: Partial<DiplanungIndexDocument>, qNote: string, isValid: boolean, isChanged: boolean) {
    // add quality notes if given
    if (qNote) {
        if (!document.extras.metadata.quality_notes) {
            document.extras.metadata.quality_notes = [];
        }
        document.extras.metadata.quality_notes.push(qNote);
    }
    // set isValid flag if given
    if (isValid != null) {
        document.extras.metadata.is_valid = isValid;
    }
    // set isChanged flag if given
    if (isChanged != null) {
        document.extras.metadata.is_changed = isChanged;
    }
}
