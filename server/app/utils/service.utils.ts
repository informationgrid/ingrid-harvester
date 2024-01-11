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

import * as xpath from 'xpath';
import * as MiscUtils from './misc.utils';
import { getNsMap, XPathNodeSelect } from './xpath.utils';
import { Distribution } from '../model/distribution';
import { DOMParser } from '@xmldom/xmldom';
import { Geometries, Geometry, GeometryCollection } from '@turf/helpers';
import { GeoJsonUtils } from './geojson.utils';
import { RequestDelegate } from './http-request.utils';
import { UrlUtils } from './url.utils';

const OGC_QUERY_PARAMS = ['request', 'service', 'version'];

export const RO_DEFAULT_LAYERNAMES = ['RP_Plan', 'LU.SpatialPlan'];
export const RO_DEFAULT_TYPENAMES = ['xplan:RP_Plan', 'plu:SpatialPlan', 'plu:SupplementaryRegulation', 'plu:LU.SpatialPlan', 'plu:LU.SupplementaryRegulation'];

const domParser: DOMParser = new DOMParser({
    errorHandler: (level, msg) => {
        // throw on error, swallow rest
        if (level == 'error') {
            throw new Error(msg);
        }
    }
});

export async function parseWfsFeatureCollection(url: string, typeNames: string, tolerance: number): Promise<Geometry | GeometryCollection> {
    let xmlResponse: string = await RequestDelegate.doRequest({
        uri: url,
        qs: {
            version: '2.0.0',
            service: 'WFS',
            request: 'GetFeature',
            typeNames
        },
        size: 8*1024*1024,   // 8 MB max
        timeout: 60000
    });
    let dom = domParser.parseFromString(xmlResponse);
    let nsMap = getNsMap(dom);
    let select = <XPathNodeSelect>xpath.useNamespaces(nsMap);
    let localGeometryNames = ['extent', 'raeumlicherGeltungsbereich', 'the_geom', 'geometry'].map(ln => `local-name()='${ln}'`).join(' or ');
    let geometryNodes = select(`./wfs:FeatureCollection/wfs:member/*/*[${localGeometryNames}]/*`, dom);
    let geometries: Geometries[] = [];
    for (let geometryNode of geometryNodes) {
        let geom = GeoJsonUtils.parse(geometryNode, { }, nsMap);
        if (geom) {
            geometries.push(geom);
        }
    }
    if (geometries.length == 1) {
        return geometries[0];
    }
    if (geometries.length > 1) {
        // return { type: 'GeometryCollection' as 'GeometryCollection', geometries };
        // TODO remove again (and use version from the line above, without converting)? temporarily convert GeometryCollections where possible
        let geometryCollection = { type: 'GeometryCollection' as 'GeometryCollection', geometries };
        return GeoJsonUtils.flatten(geometryCollection, tolerance);
    }
    return null;
}

export async function getWfsFeatureTypeMap(url: string): Promise<{ [key: string]: string[] }> {
    let featureTypeMap = {};
    let response = await RequestDelegate.doRequest({
        uri: url, qs: { service: 'WFS', request: 'GetCapabilities' }
    });
    let dom = domParser.parseFromString(response);
    const select = <XPathNodeSelect>xpath.useNamespaces(getNsMap(dom));
    let featureTypes: Node[] = select('./wfs:WFS_Capabilities/wfs:FeatureTypeList/wfs:FeatureType', dom);
    featureTypes.forEach(featureType => {
        let urlString = select('./wfs:MetadataURL/@xlink:href', featureType, true)?.textContent;
        if (!urlString) {
            return;
        }
        let url = new URL(urlString.toLowerCase());
        
        // check for fileIdentifier
        let uuid = url.searchParams.get('id');
        let name = select('./wfs:Name', featureType, true).textContent;
        if (uuid && name) {
            featureTypeMap[uuid] ??= [];
            featureTypeMap[uuid].push(name);
        }
        else {
            let match = url.pathname.match('([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})');
            let datasetUuid = match.at(1);
            if (datasetUuid) {
                featureTypeMap[datasetUuid] ??= [];
                featureTypeMap[datasetUuid].push(name);
            }
        }
    });
    return featureTypeMap;
}

export async function getWmsLayerNameMap(url: string): Promise<{ [key: string]: string[] }> {
    let layerNameMap = {};
    let response = await RequestDelegate.doRequest({
        uri: url, qs: { service: 'WMS', request: 'GetCapabilities' }
    });
    let dom = domParser.parseFromString(response);

    let nsMap = getNsMap(dom, 'wms');
    const select = <XPathNodeSelect>xpath.useNamespaces(getNsMap(dom, 'wms'));
    let layers = select('./wms:WMS_Capabilities/wms:Capability/wms:Layer/wms:Layer', dom);
    layers.forEach(layer => {
        let urlString = select('./wms:MetadataURL/wms:OnlineResource/@xlink:href', layer, true)?.textContent;
        if (!urlString) {
            return;
        }
        let url = new URL(urlString.toLowerCase());
        
        // check for fileIdentifier
        let uuid = url.searchParams.get('id');
        let name = select('./wms:Name', layer, true)?.textContent;
        if (uuid && name) {
            layerNameMap[uuid] ??= [];
            layerNameMap[uuid].push(name);
        }
        else {
            let match = url.pathname.match('([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})');
            let datasetUuid = match.at(1);
            if (datasetUuid) {
                layerNameMap[datasetUuid] ??= [];
                layerNameMap[datasetUuid].push(name);
            }
        }
    });
    return layerNameMap;
}

/**
 * Clean the URL and the format of a given distribution if it is an OGC (i.e. WFS, WMS) distribution.
 * Strips OGC parameters and trailing questionmarks.
 * 
 * Tries to deduce the correct distribution format, even if conflicting (aka "real-world") data is provided, based on:
 * `format`, `title`, and `accessURL` pathname and query parameters
 * 
 * @param distribution 
 * @returns 
 */
export function cleanDistribution(distribution: Distribution): Distribution {
    let serviceScore = {
        'WFS': 0,
        'WMS': 0
    }
    // short-circuit missing dists without accessURL
    if (!distribution.accessURL) {
        return null;
    }
    // remove empty attributes
    for (const property in distribution) {
        if (distribution[property] == null) {
            delete distribution[property];
        }
    }
    // compute score for WFS and WMS distributions
    let url = new URL(distribution.accessURL.toLowerCase());
    Object.keys(serviceScore).forEach((serviceType) => {
        serviceScore[serviceType] += MiscUtils.isIncludedI(serviceType, distribution.format) ? 2 : 0;
        serviceScore[serviceType] += MiscUtils.isIncludedI(serviceType, [url.pathname]) ? 1 : 0;
        serviceScore[serviceType] += MiscUtils.isIncludedI(serviceType, [url.searchParams.get('service')]) ? 1 : 0;
        serviceScore[serviceType] += MiscUtils.isIncludedI(serviceType, [distribution.title]) ? 0.5 : 0;
    });
    // decide if it is WFS or WMS based on computed score
    if (serviceScore['WFS'] + serviceScore['WMS'] > 0) {
        distribution.accessURL = cleanOgcUrl(distribution.accessURL);
        distribution.format = [serviceScore['WFS'] > serviceScore['WMS'] ? 'WFS' : 'WMS'];
    }
    // otherwise clean up format
    else {
        distribution.format = UrlUtils.mapFormat(distribution.format);
        if (distribution.accessURL.endsWith('pdf')) {
            distribution.format = ['PDF'];
        }
        else if (url.pathname == '/') {
            distribution.format = ['WWW'];
        }
        else if (distribution.format.length == 1 && distribution.format[0] == 'Unbekannt' && url.pathname.endsWith('.html') && url.searchParams) {
            distribution.format = ['WWW'];
        }
    }
    return distribution;
}

function cleanOgcUrl(accessURL: string): string {
    let url = new URL(accessURL);
    let markedForDeletion = [];
    for (const key of url.searchParams.keys()) {
        if (OGC_QUERY_PARAMS.includes(key.toLowerCase())) {
            markedForDeletion.push(key);
        }
    }
    markedForDeletion.forEach(key => url.searchParams.delete(key));
    return MiscUtils.strip(url.toString(), '?');
}

export async function createMissingOgcDistribution(distributions: Distribution[]): Promise<Distribution> {
    let wfsDist = distributions.find(dist => MiscUtils.isIncludedI('WFS', dist.format));
    let wmsDist = distributions.find(dist => MiscUtils.isIncludedI('WMS', dist.format));
    let syntheticDistribution: Distribution = null;
    // create WMS if WFS exists
    if (wfsDist && !wmsDist) {
        syntheticDistribution = transmutateDistribution(wfsDist, 'wfs', 'wms');
    }
    // create WFS if WMS exists
    else if (!wfsDist && wmsDist) {
        syntheticDistribution = transmutateDistribution(wmsDist, 'wms', 'wfs');
    }
    if (syntheticDistribution) {
        let status = await UrlUtils.status(syntheticDistribution.accessURL);
        if (status == 404) {
            syntheticDistribution = null;
        }
    }
    return syntheticDistribution;
}

function transmutateDistribution(distribution: Distribution, source: string, target: string): Distribution {
    function leadToGold(value: string | string[], source: string, target: string): string | string[] {
        if (Array.isArray(value)) {
            return value.map(v => v
                .replace(new RegExp(source.toLowerCase(), 'g'), target.toLowerCase())
                .replace(new RegExp(source.toUpperCase(), 'g'), target.toUpperCase()));
        }
        return value
            .replace(new RegExp(source.toLowerCase(), 'g'), target.toLowerCase())
            .replace(new RegExp(source.toUpperCase(), 'g'), target.toUpperCase());
    }
    let createdDistribution = <Distribution>Object.keys(distribution).reduce((map, key) => {
        if (distribution[key]) {
            map[key] = leadToGold(distribution[key], source, target);
        }
        return map;
    }, {});
    createdDistribution.isSynthetic = true;
    return createdDistribution;
}
