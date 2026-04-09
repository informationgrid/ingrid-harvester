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
import { GenesisMapper } from '../../../app/importer/genesis/genesis.mapper.js';
import { genesisDefaults } from '../../../app/importer/genesis/genesis.settings.js';
import { Summary } from '../../../app/model/summary.js';

const expect = chai.expect;

const baseSettings = {
    ...genesisDefaults,
    partner: 'ST',
    sourceURL: 'https://genesis.example.com',
};

const harvestTime = new Date('2026-01-01T00:00:00Z');

// Real API response from GENESIS /metadata/table endpoint
const realRecord = {
    Ident: { Service: 'metadata', Method: 'table' },
    Status: { Code: 0, Content: 'erfolgreich', Type: 'Information' },
    Parameter: {
        username: '********************',
        password: '********************',
        name: '11911-0002',
        area: 'Alle',
        language: 'de',
    },
    Object: {
        Code: '11911-0002',
        Content: 'Verwaltungsgliederung nach kreisfreien Städten und\nLandkreisen seit 01.01.2014',
        Time: { From: '01.01.2014', To: '01.01.2014' },
        Valid: 'false',
        Structure: {
            Head: {
                Code: '11911',
                Content: 'Gemeindeverzeichnis',
                Type: 'Statistik',
                Values: null,
                Selected: null,
                Functions: null,
                Structure: [
                    {
                        Code: 'STAG',
                        Content: 'Stichtag',
                        Type: 'Merkmal',
                        Values: '1',
                        Selected: '1',
                        Functions: null,
                        Structure: null,
                        Updated: 'see parent',
                    },
                ],
                Updated: 'see parent',
            },
            Columns: [
                { Code: 'GEMANZ', Content: 'Anzahl der Gemeinden', Type: 'Merkmal', Values: null, Selected: null, Functions: null, Structure: null, Updated: 'see parent' },
                { Code: 'EINGEM', Content: 'Anzahl Einheitsgemeinden', Type: 'Merkmal', Values: null, Selected: null, Functions: null, Structure: null, Updated: 'see parent' },
                { Code: 'STAREC', Content: 'Gemeinden mit Stadtrecht', Type: 'Merkmal', Values: null, Selected: null, Functions: null, Structure: null, Updated: 'see parent' },
                { Code: 'VERBAG', Content: 'Anzahl der Verbandsgemeinden', Type: 'Merkmal', Values: null, Selected: null, Functions: null, Structure: null, Updated: 'see parent' },
                { Code: 'MITGEM', Content: 'Anzahl von Mitgliedsgemeinden', Type: 'Merkmal', Values: null, Selected: null, Functions: null, Structure: null, Updated: 'see parent' },
            ],
            Rows: [
                { Code: 'KREISE', Content: 'Kreisfreie Städte und Landkreise Sachsen-Anhalts', Type: 'Merkmal', Values: null, Selected: null, Functions: null, Structure: null, Updated: 'see parent' },
            ],
            Subtitel: null,
            Subheading: null,
        },
        Updated: '15.07.2025 11:27:48h',
    },
    Copyright: '© Statistisches Landesamt Sachsen-Anhalt, Halle (Saale), 2026',
};

function makeMapper(record: any): GenesisMapper {
    const summary = new Summary('harvest', baseSettings);
    return new GenesisMapper(baseSettings, record, harvestTime, summary);
}

describe('GenesisMapper — field extraction', function () {

    describe('getTitle()', function () {
        it('returns Object.Content', function () {
            expect(makeMapper(realRecord).getTitle()).to.equal(
                'Verwaltungsgliederung nach kreisfreien Städten und\nLandkreisen seit 01.01.2014'
            );
        });

        it('returns empty string when Object.Content is missing', function () {
            expect(makeMapper({ Object: {} }).getTitle()).to.equal('');
        });
    });

    describe('getCode()', function () {
        it('returns Object.Code', function () {
            expect(makeMapper(realRecord).getCode()).to.equal('11911-0002');
        });

        it('returns empty string when Object.Code is missing', function () {
            expect(makeMapper({ Object: {} }).getCode()).to.equal('');
        });
    });

    describe('getGeneratedId()', function () {
        it('produces a stable UUID for the same partner + code', function () {
            const id1 = makeMapper(realRecord).getGeneratedId();
            const id2 = makeMapper(realRecord).getGeneratedId();
            expect(id1).to.equal(id2);
        });

        it('produces different UUIDs for different codes', function () {
            const other = { ...realRecord, Object: { ...realRecord.Object, Code: '99999-0001' } };
            expect(makeMapper(realRecord).getGeneratedId()).to.not.equal(makeMapper(other).getGeneratedId());
        });

        it('produces different UUIDs for different partners', function () {
            const settingsHE = { ...baseSettings, partner: 'HE' };
            // @ts-ignore
            const summary = new Summary('harvest', baseSettings);
            const mapperHE = new GenesisMapper(settingsHE, realRecord, harvestTime, summary);
            expect(makeMapper(realRecord).getGeneratedId()).to.not.equal(mapperHE.getGeneratedId());
        });
    });

    describe('getModifiedDate()', function () {
        it('parses "DD.MM.YYYY HH:MM:SSh" correctly', function () {
            const date = makeMapper(realRecord).getModifiedDate();
            expect(date.getFullYear()).to.equal(2025);
            expect(date.getMonth()).to.equal(6); // 0-based: July
            expect(date.getDate()).to.equal(15);
            expect(date.getHours()).to.equal(11);
            expect(date.getMinutes()).to.equal(27);
            expect(date.getSeconds()).to.equal(48);
        });
    });

    describe('getTemporal()', function () {
        it('parses "DD.MM.YYYY" Time.From and Time.To correctly', function () {
            const temporal = makeMapper(realRecord).getTemporal();
            expect(temporal).to.not.be.undefined;
            expect(temporal.gte).to.deep.equal(new Date(2014, 0, 1));
            expect(temporal.lte).to.deep.equal(new Date(2014, 0, 1));
        });

        it('returns undefined when both From and To are missing', function () {
            const record = { Object: { ...realRecord.Object, Time: {} } };
            expect(makeMapper(record).getTemporal()).to.be.undefined;
        });

        it('handles missing Time entirely', function () {
            const record = { Object: { Code: 'X', Content: 'X', Updated: '01.01.2020 00:00:00h' } };
            expect(makeMapper(record).getTemporal()).to.be.undefined;
        });
    });

    describe('getKeywords()', function () {
        it('collects Content from Head, Columns, and Rows', function () {
            const keywords = makeMapper(realRecord).getKeywords();
            expect(keywords).to.include('Gemeindeverzeichnis');
            expect(keywords).to.include('Anzahl der Gemeinden');
            expect(keywords).to.include('Gemeinden mit Stadtrecht');
            expect(keywords).to.include('Kreisfreie Städte und Landkreise Sachsen-Anhalts');
        });

        it('collects nested keywords from Head.Structure', function () {
            expect(makeMapper(realRecord).getKeywords()).to.include('Stichtag');
        });

        it('excludes "see parent" values (Updated field, not Content)', function () {
            // Updated="see parent" on structure items should not appear as Content is different
            const keywords = makeMapper(realRecord).getKeywords();
            expect(keywords).to.not.include('see parent');
        });

        it('returns empty array when Structure is missing', function () {
            const record = { Object: { Code: 'X', Content: 'X', Updated: '01.01.2020 00:00:00h' } };
            expect(makeMapper(record).getKeywords()).to.deep.equal([]);
        });
    });

    describe('getDistributions()', function () {
        it('substitutes {code} in the download URL template', function () {
            const settings = {
                ...baseSettings,
                typeConfig: {
                    ...baseSettings.typeConfig,
                    downloadUrlTemplate: 'https://example.com/tables/{code}_00.csv',
                },
            };
            // @ts-ignore
            const summary = new Summary('harvest', settings);
            const mapper = new GenesisMapper(settings, realRecord, harvestTime, summary);
            const distributions = mapper.getDistributions();
            expect(distributions).to.have.length(1);
            expect(distributions[0].access_url).to.equal('https://example.com/tables/11911-0002_00.csv');
        });

        it('returns empty array when downloadUrlTemplate is not set', function () {
            expect(makeMapper(realRecord).getDistributions()).to.deep.equal([]);
        });
    });

    describe('getCopyright()', function () {
        it('returns the Copyright field', function () {
            expect(makeMapper(realRecord).getCopyright()).to.equal(
                '© Statistisches Landesamt Sachsen-Anhalt, Halle (Saale), 2026'
            );
        });
    });

    describe('getLanguage()', function () {
        it('returns Parameter.language', function () {
            expect(makeMapper(realRecord).getLanguage()).to.equal('de');
        });
    });
});
