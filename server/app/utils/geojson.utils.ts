/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

// TODO properly credit source
// TODO this is a fork of https://github.com/derhuerst/parse-gml-polygon
// TODO it uses ISC license, which is compatible with EUPL

import rewind from '@turf/rewind';
import * as xpath from 'xpath';
import { XPathUtils } from '../utils/xpath.utils';
const deepEqual = require('deep-equal');

export class GeoJsonUtils {

    private select: Function;

    constructor(nsMap: { [name: string]: string; }) {
        this.select = xpath.useNamespaces(nsMap);
    }

    static noTransform = (...coords) => coords;

    parseCoords = (s, opts = { transformCoords: GeoJsonUtils.noTransform, stride: 2 }, ctx = { srsDimension: null }) => {
        const stride = ctx.srsDimension || opts.stride || 2
        const transformCoords = opts.transformCoords || GeoJsonUtils.noTransform

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
    }

    findIn = (root: Node, ...tags) => {
        return this.select(`.//${tags.join('/')}`, root, true);
    }

    createChildContext = (_, opts, ctx) => {
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
    }

    parsePosList = (_, opts, ctx = {}) => {
        const childCtx = this.createChildContext(_, opts, ctx);

        const coords = _.textContent;
        if (!coords) {
            throw new Error('invalid gml:posList element');
        }

        return this.parseCoords(coords, opts, childCtx);
    }

    parsePos = (_, opts, ctx = {}) => {
        const childCtx = this.createChildContext(_, opts, ctx);

        const coords = _.textContent;
        if (!coords) {
            throw new Error('invalid gml:pos element');
        }

        const points = this.parseCoords(coords, opts, childCtx);
        if (points.length !== 1) {
            throw new Error('gml:pos must have 1 point');
        }
        return points[0];
    }

    parsePoint = (_, opts, ctx = {}) => {
        const childCtx = this.createChildContext(_, opts, ctx);

        // TODO AV: Parse other gml:Point options
        const pos = this.findIn(_, 'gml:pos');
        if (!pos) {
            throw new Error('invalid gml:Point element, expected a gml:pos subelement');
        }
        return this.parsePos(pos, opts, childCtx);
    }

    parseLinearRingOrLineString = (_, opts, ctx = {}) => { // or a LineStringSegment
        const childCtx = this.createChildContext(_, opts, ctx);

        let points = [];

        const posList = this.findIn(_, 'gml:posList');
        if (posList) {
            points = this.parsePosList(posList, opts, childCtx);
        }
        else {
            Object.values(this.select('.//gml:Point', _, false)).forEach(c => {
                points.push(this.parsePoint(c, opts, childCtx));
            });
            Object.values(this.select('.//gml:pos', _, false)).forEach(c => {
                points.push(this.parsePos(c, opts, childCtx));
            });
        }

        if (points.length === 0) {
            throw new Error(_.nodeName + ' must have > 0 points');
        };
        return points;
    }

    parseCurveSegments = (_, opts, ctx = {}) => {
        let points = [];

        Object.values(this.select('.//gml:LineStringSegment|.//gml:LineString|.//gml:Arc', _, false)).forEach(c => {
            const points2 = this.parseLinearRingOrLineString(c, opts, ctx);

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
    }

    parseRing = (_, opts, ctx = {}) => {
        const childCtx = this.createChildContext(_, opts, ctx);

        const points = [];

        Object.values(this.select('.//gml:curveMember', _, false)).forEach((c: Node) => {
            let points2;

            const lineString = this.findIn(c, 'gml:LineString');
            if (lineString) {
                points2 = this.parseLinearRingOrLineString(lineString, opts, childCtx);
            } else {
                const segments = this.findIn(c, 'gml:Curve/gml:segments');
                if (!segments) {
                    throw new Error('invalid ' + c.nodeName + ' element');
                }
                points2 = this.parseCurveSegments(segments, opts, childCtx);
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
    }

    parseExteriorOrInterior = (_, opts, ctx = {}) => {
        const linearRing = this.findIn(_, 'gml:LinearRing');
        if (linearRing) {
            return this.parseLinearRingOrLineString(linearRing, opts, ctx);
        }

        const ring = this.findIn(_, 'gml:Ring');
        if (ring) {
            return this.parseRing(ring, opts, ctx);
        }
        throw new Error('invalid ' + _.nodeName + ' element');
    }

    parsePolygonOrRectangle = (_, opts, ctx = {}) => { // or PolygonPatch
        const childCtx = this.createChildContext(_, opts, ctx);

        const exterior = this.findIn(_, 'gml:exterior');
        if (!exterior) {
            throw new Error('invalid ' + _.nodeName + ' element');
        }
        const pointLists = [
            this.parseExteriorOrInterior(exterior, opts, childCtx)
        ];

        Object.values(this.select('.//gml:interior', _, false)).forEach(c => {
            pointLists.push(this.parseExteriorOrInterior(c, opts, childCtx));
        });

        return pointLists;
    }

    parseSurface = (_, opts, ctx = {}) => {
        const childCtx = this.createChildContext(_, opts, ctx);

        const patches = this.findIn(_, 'gml:patches');
        if (!patches) {
            throw new Error('invalid ' + _.nodeName + ' element');
        }
        const polygons = [];
        Object.values(this.select('.//gml:PolygonPatch|.//gml:Rectangle', _, false)).forEach(c => {
            polygons.push(this.parsePolygonOrRectangle(c, opts, childCtx));
        });

        if (polygons.length === 0) {
            throw new Error(_.nodeName + ' must have > 0 polygons');
        }
        return polygons;
    }

    parseCompositeSurface = (_, opts, ctx = {}) => {
        const childCtx = this.createChildContext(_, opts, ctx);

        const polygons = [];
        Object.values(this.select('.//gml:surfaceMember', _, false)).forEach((c: Element) => {
            const c2 = XPathUtils.firstElementChild(c);
            if (c2.nodeName === 'gml:Surface') {
                polygons.push(...this.parseSurface(c2, opts, childCtx));
            } else if (c2.nodeName === 'gml:Polygon') {
                polygons.push(this.parsePolygonOrRectangle(c2, opts, childCtx));
            }
        });

        if (polygons.length === 0) {
            throw new Error(_.nodeName + ' must have > 0 polygons');
        }
        return polygons;
    }

    parseMultiSurface = (_, opts, ctx = {}) => {
        let el = _;

        const surfaceMembers = this.findIn(_, 'gml:LinearRing');
        if (surfaceMembers) {
            el = surfaceMembers;
        }

        const polygons = [];
        Object.values(this.select('.//gml:Surface|.//gml:surfaceMember', _, false)).forEach((c: Element) => {
            if (c.nodeName === 'gml:Surface') {
                const polygons2 = this.parseSurface(c, opts, ctx);
                polygons.push(...polygons2);
            }
            else if (c.nodeName === 'gml:surfaceMember') {
                const c2 = XPathUtils.firstElementChild(c);
                if (c2.nodeName === 'gml:CompositeSurface') {
                    polygons.push(...this.parseCompositeSurface(c2, opts, ctx));
                } else if (c2.nodeName === 'gml:Surface') {
                    polygons.push(...this.parseSurface(c2, opts, ctx));
                } else if (c2.nodeName === 'gml:Polygon') {
                    polygons.push(this.parsePolygonOrRectangle(c2, opts, ctx));
                }
            }
        });

        if (polygons.length === 0) {
            throw new Error(_.nodeName + ' must have > 0 polygons');
        }
        return polygons;
    }

    parse = (_: Node, opts: { transformCoords?: any, stride?: number } = { transformCoords: GeoJsonUtils.noTransform, stride: 2 }, ctx = {}) => {
        // this.select = xpath.useNamespaces(opts.nsMap);
        const childCtx = this.createChildContext(_, opts, ctx);

        if (_.nodeName === 'gml:Polygon' || _.nodeName === 'gml:Rectangle') {
            return rewind({
                type: 'Polygon',
                coordinates: this.parsePolygonOrRectangle(_, opts, childCtx)
            });
        } else if (_.nodeName === 'gml:Surface') {
            return rewind({
                type: 'MultiPolygon',
                coordinates: this.parseSurface(_, opts, childCtx)
            });
        } else if (_.nodeName === 'gml:MultiSurface') {
            return rewind({
                type: 'MultiPolygon',
                coordinates: this.parseMultiSurface(_, opts, childCtx)
            });
        }
        return null; // todo
    }
}