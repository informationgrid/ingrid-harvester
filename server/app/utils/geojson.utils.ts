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

/*
 * Copyright (c) 2018, parse-gml-polygon authors
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above 
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

import * as xpath from 'xpath';
import * as MiscUtils from './misc.utils';
import bbox from '@turf/bbox';
import bboxPolygon from '@turf/bbox-polygon';
import booleanWithin from '@turf/boolean-within';
import buffer from '@turf/buffer';
import centroid from '@turf/centroid';
import combine from '@turf/combine';
import flatten from '@turf/flatten';
import flip from '@turf/flip';
import rewind from '@turf/rewind';
import simplify from '@turf/simplify';
import { firstElementChild } from './xpath.utils';
import { AllGeoJSON, Feature, FeatureCollection, Geometries, Geometry, GeometryCollection, MultiPoint, MultiLineString, MultiPolygon, Point } from '@turf/helpers';

const deepEqual = require('deep-equal');
const proj4 = require('proj4');
const proj4jsMappings = require('../importer/proj4.json');

// prepare proj4js
proj4.defs(Object.entries(proj4jsMappings));
const transformer: Function = (crs: string) => (x: number, y: number) => proj4(crs, 'WGS84').forward([x, y]);

export class GeoJsonUtils {

    private constructor() {
        // no instance
    }

    /**
     * Bounding box around Germany (+ 50km buffer zone for leniency)
     */
    static BBOX_GERMANY = buffer({
        'type': 'Polygon',
        'coordinates': [[
            [5.98865807458, 54.983104153], 
            [5.98865807458, 47.3024876979],
            [15.0169958839, 47.3024876979],
            [15.0169958839, 54.983104153],
            [5.98865807458, 54.983104153]]]
    }, 50, {units: 'kilometers'});

    static getBbox = (spatial: AllGeoJSON) => {
        if (!spatial) {
            return undefined;
        }
        return bboxPolygon(bbox(spatial))?.geometry;
    };

    static within = (spatial: number[] | Point | Geometry | GeometryCollection, bbox: Geometry): boolean => {
        if (!spatial) {
            return undefined;
        }
        if ('type' in spatial) {
            if ('coordinates' in spatial) {
                return booleanWithin(spatial, bbox);
            }
            else if ('geometries' in spatial) {
                return spatial.geometries.every(subGeom => GeoJsonUtils.within(subGeom, bbox));
            }
            else {
                // TODO log unexpected input
                return undefined;
            }
        }
        else {
            return booleanWithin({ type: 'Point', coordinates: spatial }, bbox);
        }
    };

    static flip = <T>(spatial: number[] | Point | Geometry | GeometryCollection): T => {
        if (!spatial) {
            return undefined;
        }
        if ('type' in spatial) {
            if ('coordinates' in spatial) {
                return flip(spatial);
            }
            else if ('geometries' in spatial) {
                return <T>{ ...spatial, geometries: spatial.geometries.map<Geometry>(geom => flip<Geometry>(geom)) };
            }
            else {
                // TODO log unexpected input
                return undefined;
            }
        }
        else {
            return flip({ type: 'Point', coordinates: spatial });
        }
    };

    static getCentroid = (spatial: Geometry | GeometryCollection) => {
        if (!spatial) {
            return undefined;
        }
        let modifiedSpatial = { ...spatial };
        // turf/centroid does not support envelope, so we turn it into a linestring which has the same centroid
        if (modifiedSpatial.type?.toLowerCase() == 'envelope') {
            modifiedSpatial.type = 'LineString';
        }
        if (modifiedSpatial.type == 'GeometryCollection') {
            (<GeometryCollection>modifiedSpatial).geometries.filter((geometry: AllGeoJSON) => geometry.type == 'Envelope').forEach((geometry: AllGeoJSON) => geometry.type = 'LineString');
        }
        return centroid(modifiedSpatial)?.geometry;
    };

    static flatten = (geometryCollection: GeometryCollection, tolerance: number): MultiLineString | MultiPoint | MultiPolygon | GeometryCollection => {
        let flattened = flatten(geometryCollection);
        let combined = combine(flattened);
        if (combined.features.length == 1) {
            let geometry = (<Feature<MultiLineString | MultiPoint | MultiPolygon>>combined.features[0]).geometry;
            if (tolerance > 0) {
                let simplified = simplify(geometry, { tolerance, highQuality: true, mutate: false });
                return simplified;
            }
            return geometry;
        }
        return geometryCollection;
    }

    /**
     * Check if the centroid of the given geometry is within Germany. If not, flip the geometry and check again.
     * 
     * @param spatial 
     * @returns spatial if centroid within Germany; flipped spatial if flipped centroid within Germany; null else
     */
    static sanitize(spatial: Geometry | GeometryCollection): Geometry | GeometryCollection {
        if (!spatial) {
            return undefined;
        }
        // check centroid
        let centroid = GeoJsonUtils.getCentroid(spatial);
        if (!GeoJsonUtils.within(centroid, GeoJsonUtils.BBOX_GERMANY)) {
            // if not, try to swap lat and lon
            let flippedCentroid = GeoJsonUtils.flip<Geometry | GeometryCollection>(centroid);
            if (GeoJsonUtils.within(flippedCentroid, GeoJsonUtils.BBOX_GERMANY)) {
                return GeoJsonUtils.flip<Geometry | GeometryCollection>(spatial);
            }
            return null;
        }
        return spatial;
    }

    static transformCollection = (featureCollection: FeatureCollection) => {
        let geometryCollection = {
            type: 'GeometryCollection' as 'GeometryCollection',
            geometries: featureCollection.features.filter(Boolean).map(feature => feature.geometry)
        };
        return geometryCollection;
    };

    /**
     * Forked from https://github.com/DoFabien/proj-geojson
     * under MIT license
     * 
     * @param spatial 
     * @param targetSystem 
     */
    static projectFeatureCollection = (featureCollection: FeatureCollection, sourceCrs: string) => {
        // Point
        const projectPoint = transformer(sourceCrs);

        // Linestring, MultiPoint?
        const projectRing = (points: any[]) => points.map(point => projectPoint(...point));
        
        // MultiLinestring, Polygon
        const projectRings = (rings) => rings.map(ring => projectRing(ring));

        // MultiPolygon
        const projectMultiRings = (multiRings) => multiRings.map(multiRing => projectRings(multiRing));

        const projectFeature = (feature) => {
            switch (feature?.geometry?.type) {
                case 'Point':
                    feature.geometry.coordinates = projectPoint(...feature.geometry.coordinates);
                    break;
                case 'MultiPoint':
                case 'LineString':
                    feature.geometry.coordinates = projectRing(feature.geometry.coordinates);
                    break;
                case 'MultiLineString':
                case 'Polygon':
                    feature.geometry.coordinates = projectRings(feature.geometry.coordinates);
                    break;
                case 'MultiPolygon':
                    feature.geometry.coordinates = projectMultiRings(feature.geometry.coordinates);
                    break;

                default:
                    return null;
            }
            return feature;
        };

        let projectedFeatureCollection = MiscUtils.structuredClone(featureCollection);
        projectedFeatureCollection.features = featureCollection.features.map(feature => projectFeature(feature));
        return projectedFeatureCollection;
    };

    static getBoundingBox = (lowerCorner: string, upperCorner: string, crs?: string) => {
        const transformCoords = transformer(crs);
        let [west, south] = transformCoords(...lowerCorner.trim().split(' ').map(parseFloat));
        let [east, north] = transformCoords(...upperCorner.trim().split(' ').map(parseFloat));

        if (west === east && north === south) {
            return {
                'type': 'point',
                'coordinates': [west, north]
            };
        }
        else if (west === east || north === south) {
            return {
                'type': 'linestring',
                'coordinates': [[west, north], [east, south]]
            };
        }
        else {
            return {
                'type': 'Polygon',
                'coordinates': [[[west, north], [west, south], [east, south], [east, north], [west, north]]]
            };
        }
    };

    static parse = (_: Node, opts: { crs?: any, stride?: number } = { crs: null, stride: 2 }, nsMap: { [ name: string ]: string; }): Geometries => {
        const select = xpath.useNamespaces(nsMap);

        const parseCoords = (s, opts: { crs?: string, stride?: number } = { crs: null, stride: 2 }, ctx = { srsDimension: null }) => {
            const stride = ctx.srsDimension || opts.stride || 2
            const transformCoords = transformer(opts.crs)
    
            const coords = s.replace(/\s+/g, ' ').trim().split(' ');
            if (coords.length === 0 || (coords.length % stride) !== 0) {
                throw new Error(`invalid coordinates list (stride ${stride})`);
            }
    
            const points = [];
            for (let i = 0; i < (coords.length - 1); i += stride) {
                const point = coords.slice(i, i + stride).map(parseFloat);
                points.push(transformCoords(...point));
            }
    
            return points;
        };
    
        const findIn = (root: Node, ...tags) => {
            return select(`.//${tags.join('/')}`, root, true);
        };
    
        const createChildContext = (_, opts, ctx) => {
            const srsDimensionAttribute = _.getAttribute('srsDimension');
    
            if (srsDimensionAttribute) {
                const srsDimension = parseInt(srsDimensionAttribute);
                if (Number.isNaN(srsDimension) || srsDimension <= 0) {
                    throw new Error(`invalid srsDimension attribute value "${srsDimensionAttribute}", expected a positive integer`);
                }
    
                const childCtx = Object.create(ctx);
                childCtx.srsDimension = srsDimension;
                return childCtx;
            }
    
            return ctx;
        };
    
        const parsePosList = (_, opts, ctx = {}) => {
            const childCtx = createChildContext(_, opts, ctx);
    
            const coords = _.textContent;
            if (!coords) {
                throw new Error('invalid gml:posList element');
            }
    
            return parseCoords(coords, opts, childCtx);
        };
    
        const parsePos = (_, opts, ctx = {}) => {
            const childCtx = createChildContext(_, opts, ctx);
    
            const coords = _.textContent;
            if (!coords) {
                throw new Error('invalid gml:pos element');
            }
    
            const points = parseCoords(coords, opts, childCtx);
            if (points.length !== 1) {
                throw new Error('gml:pos must have 1 point');
            }
            return points[0];
        };
    
        const parsePoint = (_, opts, ctx = {}) => {
            const childCtx = createChildContext(_, opts, ctx);
    
            // TODO AV: Parse other gml:Point options
            const pos = findIn(_, 'gml:pos');
            if (!pos) {
                throw new Error('invalid gml:Point element, expected a gml:pos subelement');
            }
            return parsePos(pos, opts, childCtx);
        };
    
        const parseLinearRingOrLineString = (_, opts, ctx = {}) => { // or a LineStringSegment
            const childCtx = createChildContext(_, opts, ctx);
    
            let points = [];
    
            const posList = findIn(_, 'gml:posList');
            if (posList) {
                points = parsePosList(posList, opts, childCtx);
            }
            else {
                Object.values(select('.//gml:Point', _)).forEach(c => {
                    points.push(parsePoint(c, opts, childCtx));
                });
                Object.values(select('.//gml:pos', _)).forEach(c => {
                    points.push(parsePos(c, opts, childCtx));
                });
            }
    
            if (points.length === 0) {
                throw new Error(_.nodeName + ' must have > 0 points');
            }
            return points;
        };
    
        const parseCurveSegments = (_, opts, ctx = {}) => {
            let points = [];
    
            Object.values(select('.//gml:LineStringSegment|.//gml:LineString|.//gml:Arc', _)).forEach(c => {
                const points2 = parseLinearRingOrLineString(c, opts, ctx);
    
                // remove overlapping
                const end = points[points.length - 1];
                const start = points2[0];
                if (end && start && deepEqual(end, start)) {
                    points2.shift();
                }
                points.push(...points2);
            });
    
            if (points.length === 0) {
                throw new Error('gml:Curve > gml:segments must have > 0 points');
            }
            return points;
        };
    
        const parseRing = (_, opts, ctx = {}) => {
            const childCtx = createChildContext(_, opts, ctx);
    
            const points = [];
    
            Object.values(select('.//gml:curveMember', _)).forEach((c: Node) => {
                let points2;
    
                const lineString = findIn(c, 'gml:LineString');
                if (lineString) {
                    points2 = parseLinearRingOrLineString(lineString, opts, childCtx);
                }
                else {
                    const segments = findIn(c, 'gml:Curve/gml:segments');
                    if (!segments) {
                        throw new Error('invalid ' + c.nodeName + ' element');
                    }
                    points2 = parseCurveSegments(segments, opts, childCtx);
                }
    
                // remove overlapping
                const end = points[points.length - 1];
                const start = points2[0];
                if (end && start && deepEqual(end, start)) {
                    points2.shift();
                }
                points.push(...points2);
            });
    
            if (points.length < 4) {
                throw new Error(_.nodeName + ' must have >= 4 points');
            }
            return points;
        };
    
        const parseExteriorOrInterior = (_, opts, ctx = {}) => {
            const linearRing = findIn(_, 'gml:LinearRing');
            if (linearRing) {
                return parseLinearRingOrLineString(linearRing, opts, ctx);
            }
    
            const ring = findIn(_, 'gml:Ring');
            if (ring) {
                return parseRing(ring, opts, ctx);
            }
            throw new Error('invalid ' + _.nodeName + ' element');
        };
    
        const parsePolygonOrRectangle = (_, opts, ctx = {}) => { // or PolygonPatch
            const childCtx = createChildContext(_, opts, ctx);
    
            const exterior = findIn(_, 'gml:exterior');
            if (!exterior) {
                throw new Error('invalid ' + _.nodeName + ' element');
            }
            const pointLists = [
                parseExteriorOrInterior(exterior, opts, childCtx)
            ];
    
            Object.values(select('.//gml:interior', _)).forEach(c => {
                pointLists.push(parseExteriorOrInterior(c, opts, childCtx));
            });
    
            return pointLists;
        };
    
        const parseSurface = (_, opts, ctx = {}) => {
            const childCtx = createChildContext(_, opts, ctx);
    
            const patches = findIn(_, 'gml:patches');
            if (!patches) {
                throw new Error('invalid ' + _.nodeName + ' element');
            }
            const polygons = [];
            Object.values(select('.//gml:PolygonPatch|.//gml:Rectangle', _)).forEach(c => {
                polygons.push(parsePolygonOrRectangle(c, opts, childCtx));
            });
    
            if (polygons.length === 0) {
                throw new Error(_.nodeName + ' must have > 0 polygons');
            }
            return polygons;
        };
    
        const parseCompositeSurface = (_, opts, ctx = {}) => {
            const childCtx = createChildContext(_, opts, ctx);
    
            const polygons = [];
            Object.values(select('.//gml:surfaceMember', _)).forEach((c: Element) => {
                const c2 = firstElementChild(c);
                if (c2.nodeName === 'gml:Surface') {
                    polygons.push(...parseSurface(c2, opts, childCtx));
                }
                else if (c2.nodeName === 'gml:Polygon') {
                    polygons.push(parsePolygonOrRectangle(c2, opts, childCtx));
                }
            });
    
            if (polygons.length === 0) {
                throw new Error(_.nodeName + ' must have > 0 polygons');
            }
            return polygons;
        };
    
        const parseMultiSurface = (_, opts, ctx = {}) => {
            let el = _;
    
            const surfaceMembers = findIn(_, 'gml:LinearRing');
            if (surfaceMembers) {
                el = surfaceMembers;
            }
    
            const polygons = [];
            Object.values(select('.//gml:Surface|.//gml:surfaceMember', _)).forEach((c: Element) => {
                if (c.nodeName === 'gml:Surface') {
                    const polygons2 = parseSurface(c, opts, ctx);
                    polygons.push(...polygons2);
                }
                else if (c.nodeName === 'gml:surfaceMember') {
                    const c2 = firstElementChild(c);
                    if (c2.nodeName === 'gml:CompositeSurface') {
                        polygons.push(...parseCompositeSurface(c2, opts, ctx));
                    }
                    else if (c2.nodeName === 'gml:Surface') {
                        polygons.push(...parseSurface(c2, opts, ctx));
                    }
                    else if (c2.nodeName === 'gml:Polygon') {
                        polygons.push(parsePolygonOrRectangle(c2, opts, ctx));
                    }
                }
            });
    
            if (polygons.length === 0) {
                throw new Error(_.nodeName + ' must have > 0 polygons');
            }
            return polygons;
        };

        const childCtx = createChildContext(_, opts, {});

        if (!opts) {
            opts = {};
        }
        if (!opts.crs) {
            // observed Patterns for CRS are
            // - urn:ogc:def:crs:EPSG::4326
            // - http://www.opengis.net/def/crs/EPSG/0/4326
            opts.crs = (<Element>_).getAttribute('srsName')?.replace(/^.*?(\d+)$/, '$1');
        }

        if (_.nodeName === 'gml:Point') {
            return {
                type: 'Point',
                coordinates: parsePoint(_, opts, childCtx)
            };
        }
        else if (_.nodeName === 'gml:LineString') {
            return rewind({
                type: 'LineString',
                coordinates: parseLinearRingOrLineString(_, opts, childCtx)
            });
        }
        else if (_.nodeName === 'gml:MultiCurve') {
            return {
                type: 'MultiLineString',
                coordinates: [parseRing(_, opts, childCtx)]
            };
        }
        else if (_.nodeName === 'gml:Polygon' || _.nodeName === 'gml:Rectangle') {
            return rewind({
                type: 'Polygon',
                coordinates: parsePolygonOrRectangle(_, opts, childCtx)
            });
        }
        else if (_.nodeName === 'gml:Surface') {
            return rewind({
                type: 'MultiPolygon',
                coordinates: parseSurface(_, opts, childCtx)
            });
        }
        else if (_.nodeName === 'gml:MultiSurface') {
            return rewind({
                type: 'MultiPolygon',
                coordinates: parseMultiSurface(_, opts, childCtx)
            });
        }
        else if (_.nodeName === 'gml:MultiGeometry') {
            // TODO similar to gml:MultiSurface ??
            // example: https://metropolplaner.de/osterholz/wfs?typeNames=plu:LU.SupplementaryRegulation&request=GetFeature
        }
        return null;
    };
}

