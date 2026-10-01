/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2026 wemove digital solutions GmbH
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

import { DOMParser } from '@xmldom/xmldom';
import { expect } from 'chai';
import fs from 'fs';
import { DataFactory } from 'n3';
import xpath from 'xpath';
import { DcatapIsoMapper } from '../../../app/importer/dcatap/dcatap.iso.mapper.js';
import { DcatapMapper } from '../../../app/importer/dcatap/dcatap.mapper.js';
import { parseRdfPayload } from '../../../app/importer/dcatap/dcatap.rdf.js';
import type { DcatapSettings } from '../../../app/importer/dcatap/dcatap.settings.js';
import { namespaces } from '../../../app/importer/namespaces.js';
import { Summary } from '../../../app/model/summary.js';
import settings from '../../data/dcatap/dessau-rosslau/config.json' with { type: 'json' };

const select = xpath.useNamespaces({ gmd: namespaces.GMD, gco: namespaces.GCO, gmx: namespaces.GMX, xlink: namespaces.XLINK });

describe('DcatapIsoMapper.createCswIsoDocument (dessau-rosslau, a537c7007dd44945bc378eb59e10314c)', function () {

    let doc: Document;

    const text = (path: string): string[] => (select(path, doc) as Node[]).map(node => node.textContent);

    before(async function () {
        const payload = fs.readFileSync('test/data/dcatap/dessau-rosslau/input/3.0.0.json_sample', 'utf8');
        const store = await parseRdfPayload(payload, settings.sourceURL);
        const [datasetSubject] = store.getSubjects(
            DataFactory.namedNode(namespaces.RDF + 'type'),
            DataFactory.namedNode(namespaces.DCAT + 'Dataset'),
            null
        );
        const mapper = new DcatapMapper(settings as DcatapSettings, datasetSubject, store, payload, new Date('2026-09-30T00:00:00Z'), new Summary('test', settings as any));
        doc = new DOMParser().parseFromString(new DcatapIsoMapper(mapper).createCswIsoDocument(), 'application/xml');
    });

    it('maps metadata information', function () {
        expect(text('/gmd:MD_Metadata/gmd:fileIdentifier/gco:CharacterString')).to.deep.equal(['a537c7007dd44945bc378eb59e10314c']);
        expect(text('/gmd:MD_Metadata/gmd:language/gmd:LanguageCode/@codeListValue')).to.deep.equal(['ger']);
        expect(text('/gmd:MD_Metadata/gmd:hierarchyLevel/gmd:MD_ScopeCode/@codeListValue')).to.deep.equal(['dataset']);
        expect(text('/gmd:MD_Metadata/gmd:dateStamp/gco:DateTime')).to.deep.equal(['2026-08-07T12:26:32.000Z']);
        expect(text('/gmd:MD_Metadata/gmd:contact/gmd:CI_ResponsibleParty/gmd:organisationName/gco:CharacterString')).to.deep.equal(['Kreisfreie Stadt Dessau-Roßlau']);
        expect(text('/gmd:MD_Metadata/gmd:contact//gmd:electronicMailAddress/gco:CharacterString')).to.deep.equal(['gis@dessau-rosslau.de']);
        expect(text('/gmd:MD_Metadata/gmd:contact//gmd:CI_RoleCode/@codeListValue')).to.deep.equal(['pointOfContact']);
    });

    it('maps identification information', function () {
        const idInfo = '/gmd:MD_Metadata/gmd:identificationInfo/gmd:MD_DataIdentification';
        expect(text(`${idInfo}/gmd:citation/gmd:CI_Citation/gmd:title/gco:CharacterString`)).to.deep.equal(['Stadtgliederung']);
        expect(text(`${idInfo}/gmd:citation/gmd:CI_Citation/gmd:date/gmd:CI_Date/gmd:date/gco:Date`)).to.deep.equal(['2026-08-07', '2026-08-07']);
        expect(text(`${idInfo}/gmd:citation/gmd:CI_Citation/gmd:identifier/gmd:MD_Identifier/gmd:code/gco:CharacterString`)).to.deep.equal(['https://www.arcgis.com/home/item.html?id=a537c7007dd44945bc378eb59e10314c']);
        expect(text(`${idInfo}/gmd:abstract/gco:CharacterString`)[0]).to.match(/^Stadtteile, Stadtbezirke, Ortschaften, Stadtbezirksbeiräte Seit sich/);
        expect(text(`${idInfo}/gmd:pointOfContact/gmd:CI_ResponsibleParty/gmd:role/gmd:CI_RoleCode/@codeListValue`)).to.deep.equal(['pointOfContact', 'publisher']);
        expect(text(`${idInfo}/gmd:pointOfContact/gmd:CI_ResponsibleParty/gmd:organisationName/gco:CharacterString`)).to.deep.equal(['Kreisfreie Stadt Dessau-Roßlau', 'Stadt Dessau-Roßlau']);
        expect(text(`${idInfo}/gmd:descriptiveKeywords/gmd:MD_Keywords/gmd:keyword/gco:CharacterString`)).to.deep.equal(['Statistische Einheiten']);
        expect(text(`${idInfo}/gmd:resourceConstraints`)).to.be.empty;
        expect(text(`${idInfo}/gmd:language/gmd:LanguageCode/@codeListValue`)).to.deep.equal(['ger']);
        expect(text(`${idInfo}/gmd:characterSet/gmd:MD_CharacterSetCode/@codeListValue`)).to.deep.equal(['utf8']);
    });

    it('maps the geographic extent', function () {
        const bbox = '/gmd:MD_Metadata/gmd:identificationInfo/gmd:MD_DataIdentification/gmd:extent/gmd:EX_Extent/gmd:geographicElement/gmd:EX_GeographicBoundingBox';
        expect(text(`${bbox}/gmd:westBoundLongitude/gco:Decimal`)).to.deep.equal(['12.104646']);
        expect(text(`${bbox}/gmd:eastBoundLongitude/gco:Decimal`)).to.deep.equal(['12.369028']);
        expect(text(`${bbox}/gmd:southBoundLatitude/gco:Decimal`)).to.deep.equal(['51.732581']);
        expect(text(`${bbox}/gmd:northBoundLatitude/gco:Decimal`)).to.deep.equal(['51.974815']);
    });

    it('maps distributions', function () {
        const distribution = '/gmd:MD_Metadata/gmd:distributionInfo/gmd:MD_Distribution';
        expect(text(`${distribution}/gmd:distributionFormat/gmd:MD_Format/gmd:name/gco:CharacterString`)).to.deep.equal(['HTML']);
        expect(text(`${distribution}/gmd:transferOptions/gmd:MD_DigitalTransferOptions/gmd:onLine/gmd:CI_OnlineResource/gmd:linkage/gmd:URL`)).to.deep.equal([
            'https://open-data.stadtatlas.dessau-rosslau.de/maps/dero::stadtgliederung-3',
            'https://www.arcgis.com/home/item.html?id=a537c7007dd44945bc378eb59e10314c',
            'https://stadtatlas.dessau-rosslau.de/server/rest/services/Verwaltung/Stadtgliederung/FeatureServer',
            'https://www.arcgis.com/sharing/rest/content/items/a537c7007dd44945bc378eb59e10314c/info/metadata/metadata.xml?format=default'
        ]);
    });

    it('maps data quality', function () {
        const dataQuality = '/gmd:MD_Metadata/gmd:dataQualityInfo/gmd:DQ_DataQuality';
        expect(text(`${dataQuality}/gmd:scope/gmd:DQ_Scope/gmd:level/gmd:MD_ScopeCode/@codeListValue`)).to.deep.equal(['dataset']);
        expect(text(`${dataQuality}/gmd:report/gmd:DQ_DomainConsistency/gmd:result/gmd:DQ_ConformanceResult/gmd:specification/gmd:CI_Citation/gmd:title/gco:CharacterString`)).to.deep.equal([
            'COMMISSION REGULATION (EU) No 1089/2010 of 23 November 2010 implementing Directive 2007/2/EC of the European Parliament and of the Council as regards interoperability of spatial data sets and services'
        ]);
        expect(text(`${dataQuality}/gmd:lineage`)).to.be.empty;
    });
});

describe('DcatapIsoMapper.createCswIsoDocument (reused getters)', function () {

    const sourceURL = 'https://example.com/catalog.jsonld';
    const payload = {
        '@context': {
            dcat: 'http://www.w3.org/ns/dcat#',
            dct: 'http://purl.org/dc/terms/',
            skos: 'http://www.w3.org/2004/02/skos/core#',
            vcard: 'http://www.w3.org/2006/vcard/ns#'
        },
        '@graph': [{
            '@id': 'https://example.com/dataset/1',
            '@type': 'dcat:Dataset',
            'dct:identifier': 'dataset-1',
            'dct:title': 'Test dataset',
            'dct:abstract': 'Abstract only',
            'dct:modified': { '@value': '2026-01-02T03:04:05Z', '@type': 'http://www.w3.org/2001/XMLSchema#dateTime' },
            'dcat:theme': [{ '@id': 'http://inspire.ec.europa.eu/theme/au' }, 'Umwelt'],
            'dcat:contactPoint': {
                '@type': 'vcard:Organization',
                'vcard:fn': 'Test Organisation',
                'vcard:role': 'custodian',
                'vcard:hasEmail': { '@id': 'mailto:info@example.com' },
                'vcard:hasAddress': {
                    'vcard:street-address': 'Hauptstraße 1',
                    'vcard:locality': 'Dessau-Roßlau',
                    'vcard:postal-code': '06844',
                    'vcard:country-name': 'Deutschland'
                }
            }
        }, {
            '@id': 'http://inspire.ec.europa.eu/theme/au',
            'skos:prefLabel': 'Verwaltungseinheiten'
        }]
    };

    let mapper: DcatapMapper;
    let doc: Document;

    const text = (path: string): string[] => (select(path, doc) as Node[]).map(node => node.textContent);
    const idInfo = '/gmd:MD_Metadata/gmd:identificationInfo/gmd:MD_DataIdentification';

    before(async function () {
        const store = await parseRdfPayload(payload, sourceURL);
        const [datasetSubject] = store.getSubjects(
            DataFactory.namedNode(namespaces.RDF + 'type'),
            DataFactory.namedNode(namespaces.DCAT + 'Dataset'),
            null
        );
        const testSettings = { sourceURL } as DcatapSettings;
        mapper = new DcatapMapper(testSettings, datasetSubject, store, JSON.stringify(payload), new Date('2026-09-30T00:00:00Z'), new Summary('test', testSettings));
        doc = new DOMParser().parseFromString(new DcatapIsoMapper(mapper).createCswIsoDocument(), 'application/xml');
    });

    it('uses getDescription() with dct:abstract fallback', function () {
        expect(text(`${idInfo}/gmd:abstract/gco:CharacterString`)).to.deep.equal(['Abstract only']);
    });

    it('uses getModifiedDate() for dateStamp and revision date', function () {
        expect(text('/gmd:MD_Metadata/gmd:dateStamp/gco:DateTime')).to.deep.equal(['2026-01-02T03:04:05.000Z']);
        expect(text(`${idInfo}/gmd:citation/gmd:CI_Citation/gmd:date/gmd:CI_Date[gmd:dateType/gmd:CI_DateTypeCode/@codeListValue="revision"]/gmd:date/gco:Date`)).to.deep.equal(['2026-01-02']);
    });

    it('uses getThemes() for theme keywords', function () {
        const inspire = `${idInfo}/gmd:descriptiveKeywords/gmd:MD_Keywords[gmd:thesaurusName]`;
        expect(text(`${inspire}/gmd:keyword/gmx:Anchor`)).to.deep.equal(['Verwaltungseinheiten']);
        expect(text(`${inspire}/gmd:keyword/gmx:Anchor/@xlink:href`)).to.deep.equal(['http://inspire.ec.europa.eu/theme/au']);
        const other = `${idInfo}/gmd:descriptiveKeywords/gmd:MD_Keywords[not(gmd:thesaurusName)][gmd:type]`;
        expect(text(`${other}/gmd:keyword/gco:CharacterString`)).to.deep.equal(['Umwelt']);
    });

    it('uses getContactPoints() for contacts', function () {
        const party = '/gmd:MD_Metadata/gmd:contact/gmd:CI_ResponsibleParty';
        expect(text(`${party}/gmd:individualName`)).to.be.empty;
        expect(text(`${party}/gmd:organisationName/gco:CharacterString`)).to.deep.equal(['Test Organisation']);
        const address = `${idInfo}/gmd:pointOfContact/gmd:CI_ResponsibleParty/gmd:contactInfo/gmd:CI_Contact/gmd:address/gmd:CI_Address`;
        expect(text(`${address}/gmd:deliveryPoint/gco:CharacterString`)).to.deep.equal(['Hauptstraße 1']);
        expect(text(`${address}/gmd:city/gco:CharacterString`)).to.deep.equal(['Dessau-Roßlau']);
        expect(text(`${address}/gmd:postalCode/gco:CharacterString`)).to.deep.equal(['06844']);
        expect(text(`${address}/gmd:country/gco:CharacterString`)).to.deep.equal(['Deutschland']);
        expect(text(`${address}/gmd:electronicMailAddress/gco:CharacterString`)).to.deep.equal(['info@example.com']);
        expect(text(`${idInfo}/gmd:pointOfContact//gmd:CI_RoleCode/@codeListValue`)).to.deep.equal(['custodian']);
        // no pointOfContact role -> first party is used as metadata contact
        expect(text('/gmd:MD_Metadata/gmd:contact//gmd:CI_RoleCode/@codeListValue')).to.deep.equal(['custodian']);
    });

    it('keeps getContactPoint() fields used by the ES document', function () {
        const contact = mapper.getContactPoint();
        expect(contact.fn).to.equal('Test Organisation');
        expect(contact.hasEmail).to.equal('info@example.com');
        expect(contact['organization-name']).to.be.undefined;
    });
});

