/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
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

import * as chai from 'chai';
import type { GeometryCollection, LineString, MultiLineString, MultiPolygon, Point, Polygon } from 'geojson';
import { fromWkt, toWkt } from '../../app/utils/geojson.utils.js';

const expect = chai.expect;

describe('geojson.utils WKT parsing and formatting', function () {
    describe('fromWkt()', function () {
        it('parses standard Point geometry', function () {
            const geom = fromWkt('POINT(10.0 53.5)') as Point;
            expect(geom).to.exist;
            expect(geom.type).to.equal('Point');
            expect(geom.coordinates).to.deep.equal([10.0, 53.5]);
            expect(geom.bbox).to.deep.equal([10.0, 53.5, 10.0, 53.5]);
        });

        it('parses Point with whitespace and lower-case keyword', function () {
            const geom = fromWkt('point ( 10.5  53.2 )') as Point;
            expect(geom).to.exist;
            expect(geom.type).to.equal('Point');
            expect(geom.coordinates).to.deep.equal([10.5, 53.2]);
        });

        it('parses Point with URI CRS prefix', function () {
            const geom = fromWkt('<http://www.opengis.net/def/crs/OGC/1.3/CRS84> POINT(10.0 53.5)') as Point;
            expect(geom).to.exist;
            expect(geom.type).to.equal('Point');
            expect(geom.coordinates).to.deep.equal([10.0, 53.5]);
        });

        it('parses Point with EPSG URI CRS prefix', function () {
            const geom = fromWkt('<http://www.opengis.net/def/crs/EPSG/0/4326> POINT(10.0 53.5)') as Point;
            expect(geom).to.exist;
            expect(geom.type).to.equal('Point');
            expect(geom.coordinates).to.deep.equal([10.0, 53.5]);
        });

        it('parses Point with SRID prefix (EWKT)', function () {
            const geom = fromWkt('SRID=4326;POINT(10.0 53.5)') as Point;
            expect(geom).to.exist;
            expect(geom.type).to.equal('Point');
            expect(geom.coordinates).to.deep.equal([10.0, 53.5]);
        });

        it('parses Point with comma-separated coordinates', function () {
            const geom = fromWkt('POINT(10.0, 53.5)') as Point;
            expect(geom).to.exist;
            expect(geom.type).to.equal('Point');
            expect(geom.coordinates).to.deep.equal([10.0, 53.5]);
        });

        it('parses standard Polygon geometry and computes bbox and rewind', function () {
            const wkt = 'POLYGON((10.0 50.0, 11.0 50.0, 11.0 51.0, 10.0 51.0, 10.0 50.0))';
            const geom = fromWkt(wkt) as Polygon;
            expect(geom).to.exist;
            expect(geom.type).to.equal('Polygon');
            expect(geom.coordinates).to.have.lengthOf(1);
            expect(geom.bbox).to.deep.equal([10.0, 50.0, 11.0, 51.0]);
        });

        it('parses Polygon with all-comma-separated coordinates (ArcGIS Hub format)', function () {
            const wkt = 'POLYGON((12.104646,51.974815,12.369028,51.974815,12.369028,51.732581,12.104646,51.732581,12.104646,51.974815))';
            const geom = fromWkt(wkt) as Polygon;
            expect(geom).to.exist;
            expect(geom.type).to.equal('Polygon');
            expect(geom.coordinates[0]).to.have.lengthOf(5);
            expect(geom.bbox).to.deep.equal([12.104646, 51.732581, 12.369028, 51.974815]);
        });

        it('parses Polygon with interior hole', function () {
            const wkt = 'POLYGON((35 10, 45 45, 15 40, 10 20, 35 10), (20 30, 35 35, 30 20, 20 30))';
            const geom = fromWkt(wkt) as Polygon;
            expect(geom).to.exist;
            expect(geom.type).to.equal('Polygon');
            expect(geom.coordinates).to.have.lengthOf(2);
            expect(geom.bbox).to.exist;
        });

        it('parses LineString geometry', function () {
            const wkt = 'LINESTRING(30 10, 10 30, 40 40)';
            const geom = fromWkt(wkt) as LineString;
            expect(geom).to.exist;
            expect(geom.type).to.equal('LineString');
            expect(geom.coordinates).to.deep.equal([[30, 10], [10, 30], [40, 40]]);
            expect(geom.bbox).to.deep.equal([10, 10, 40, 40]);
        });

        it('parses MultiLineString geometry', function () {
            const wkt = 'MULTILINESTRING((10 10, 20 20, 10 40), (40 40, 30 30, 40 20, 30 10))';
            const geom = fromWkt(wkt) as MultiLineString;
            expect(geom).to.exist;
            expect(geom.type).to.equal('MultiLineString');
            expect(geom.coordinates).to.have.lengthOf(2);
            expect(geom.bbox).to.deep.equal([10, 10, 40, 40]);
        });

        it('parses MultiPolygon geometry', function () {
            const wkt = 'MULTIPOLYGON(((40 40, 20 45, 45 30, 40 40)), ((20 35, 10 30, 10 10, 30 5, 45 20, 20 35), (30 20, 20 15, 20 25, 30 20)))';
            const geom = fromWkt(wkt) as MultiPolygon;
            expect(geom).to.exist;
            expect(geom.type).to.equal('MultiPolygon');
            expect(geom.coordinates).to.have.lengthOf(2);
            expect(geom.bbox).to.exist;
        });

        it('parses GeometryCollection', function () {
            const wkt = 'GEOMETRYCOLLECTION(POINT(4 6), LINESTRING(4 6, 7 10))';
            const geom = fromWkt(wkt) as GeometryCollection;
            expect(geom).to.exist;
            expect(geom.type).to.equal('GeometryCollection');
            expect(geom.geometries).to.have.lengthOf(2);
            expect(geom.geometries[0].type).to.equal('Point');
            expect(geom.geometries[1].type).to.equal('LineString');
        });

        it('returns undefined for invalid or malformed WKT strings', function () {
            expect(fromWkt(undefined as any)).to.be.undefined;
            expect(fromWkt(null as any)).to.be.undefined;
            expect(fromWkt('')).to.be.undefined;
            expect(fromWkt('   ')).to.be.undefined;
            expect(fromWkt(123 as any)).to.be.undefined;
            expect(fromWkt('INVALID(10 20)')).to.be.undefined;
            expect(fromWkt('POINT(10)')).to.be.undefined;
            expect(fromWkt('POLYGON((10 20, 30))')).to.be.undefined;
            expect(fromWkt('NOT A WKT STRING')).to.be.undefined;
        });
    });

    describe('toWkt()', function () {
        it('converts Point geometry to WKT', function () {
            const geom: Point = { type: 'Point', coordinates: [10.0, 53.5] };
            const wkt = toWkt(geom);
            expect(wkt).to.match(/POINT\s*\(\s*10(\.0)?\s+53\.5\s*\)/i);
        });

        it('converts Polygon geometry to WKT', function () {
            const geom: Polygon = {
                type: 'Polygon',
                coordinates: [[[10, 50], [11, 50], [11, 51], [10, 51], [10, 50]]]
            };
            const wkt = toWkt(geom);
            expect(wkt).to.match(/POLYGON\s*\(\s*\(\s*10/i);
        });

        it('converts MultiPolygon geometry to WKT', function () {
            const geom: MultiPolygon = {
                type: 'MultiPolygon',
                coordinates: [[[[10, 50], [11, 50], [11, 51], [10, 51], [10, 50]]]]
            };
            const wkt = toWkt(geom);
            expect(wkt).to.match(/MULTIPOLYGON/i);
        });

        it('returns undefined for null or undefined geometry', function () {
            expect(toWkt(undefined)).to.be.undefined;
            expect(toWkt(null)).to.be.undefined;
        });
    });
});
