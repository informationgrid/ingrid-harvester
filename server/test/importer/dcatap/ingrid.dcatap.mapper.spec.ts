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

import { expect } from 'chai';
import { DataFactory } from 'n3';
import { DcatapMapper } from '../../../app/importer/dcatap/dcatap.mapper.js';
import { parseRdfPayload } from '../../../app/importer/dcatap/dcatap.rdf.js';
import type { DcatapSettings } from '../../../app/importer/dcatap/dcatap.settings.js';
import { namespaces } from '../../../app/importer/namespaces.js';
import { Summary } from '../../../app/model/summary.js';
import { ingridDcatapMapper } from '../../../app/profiles/ingrid/mapper/ingrid.dcatap.mapper.js';

const SOURCE_URL = 'https://example.org/catalog.ttl';

const settings = {
    type: 'DCATAP',
    sourceURL: SOURCE_URL,
    createGeometadata: true
} as DcatapSettings;

// dates without time zone are parsed as local time, so the formatted values do not depend on the time zone
const FULL_DATASET = `
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dcatap: <http://data.europa.eu/r5r/> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix vcard: <http://www.w3.org/2006/vcard/ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<https://example.org/dataset/1> a dcat:Dataset ;
    dct:identifier "dataset-1" ;
    dct:title "Titel" ;
    dct:alternative "Alternativer Titel" ;
    dct:description "Beschreibung" ;
    dct:language <http://publications.europa.eu/resource/authority/language/ENG> ;
    dct:issued "2021-03-01T00:00:00"^^xsd:dateTime ;
    dct:modified "2022-05-02T00:00:00"^^xsd:dateTime ;
    dct:accrualPeriodicity <http://publications.europa.eu/resource/authority/frequency/ANNUAL> ;
    dct:temporal [ a dct:PeriodOfTime ; dcat:startDate "2020-01-01T00:00:00"^^xsd:dateTime ; dcat:endDate "2020-12-31T00:00:00"^^xsd:dateTime ] ;
    dcat:keyword "Wasser", "Umwelt" ;
    dcat:theme <http://inspire.ec.europa.eu/theme/au>, <http://publications.europa.eu/resource/authority/data-theme/GOVE> ;
    dct:spatial [ a dct:Location ; skos:prefLabel "Rostock" ] ;
    dct:conformsTo <http://www.opengis.net/def/crs/EPSG/0/25833>, <http://dcat-ap.de/def/dcatde/> ;
    dcat:spatialResolutionInMeters "10.5"^^xsd:decimal ;
    dct:provenance [ rdfs:label "Digitalisiert aus Karten" ] ;
    dct:accessRights <http://publications.europa.eu/resource/authority/access-right/PUBLIC> ;
    dcatap:applicableLegislation <http://data.europa.eu/eli/reg_impl/2023/138/oj> ;
    dcat:landingPage <https://example.org/landing> ;
    dcat:contactPoint [
        a vcard:Individual ;
        vcard:fn "Max Muster" ;
        vcard:organization-name "Amt für Umwelt" ;
        vcard:hasEmail <mailto:max@example.org> ;
        vcard:hasTelephone <tel:+49123> ;
        vcard:hasURL <https://example.org/amt> ;
        vcard:hasAddress [ vcard:street-address "Hauptstr. 1" ; vcard:locality "Rostock" ; vcard:postal-code "18055" ; vcard:region "MV" ; vcard:country-name "Deutschland" ]
    ] ;
    dct:publisher [ a foaf:Organization ; foaf:name "Stadt Rostock" ; foaf:mbox <mailto:info@rostock.de> ] ;
    dcat:distribution [
        a dcat:Distribution ;
        dct:title "CSV-Download" ;
        dct:description "Daten als CSV" ;
        dct:format <http://publications.europa.eu/resource/authority/file-type/CSV> ;
        dcat:downloadURL <https://example.org/data.csv> ;
        dct:license <http://dcat-ap.de/def/licenses/cc-zero> ;
        dct:rights "Quellenvermerk: Stadt Rostock"
    ], [
        a dcat:Distribution ;
        dct:title "WMS" ;
        dct:format <http://publications.europa.eu/resource/authority/file-type/WMS_SRVC> ;
        dcat:accessURL <https://example.org/wms?SERVICE=WMS&REQUEST=GetCapabilities>
    ] .
`;

const MINIMAL_DATASET = `
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dct: <http://purl.org/dc/terms/> .

<https://example.org/dataset/2> a dcat:Dataset ;
    dct:identifier "dataset-2" ;
    dct:title "Titel" ;
    dct:description "Beschreibung" .
`;

async function createMapper(payload: string): Promise<ingridDcatapMapper> {
    const store = await parseRdfPayload(payload, SOURCE_URL);
    const [datasetSubject] = store.getSubjects(
        DataFactory.namedNode(namespaces.RDF + 'type'),
        DataFactory.namedNode(namespaces.DCAT + 'Dataset'),
        null
    );
    const mapper = new DcatapMapper(settings, datasetSubject, store, payload, new Date(), new Summary('test', settings as any));
    return new ingridDcatapMapper(mapper);
}

describe('ingridDcatapMapper geodata index fields (FR-011)', function () {

    let mapper: ingridDcatapMapper;

    before(async function () {
        mapper = await createMapper(FULL_DATASET);
    });

    it('maps identification and time fields', function () {
        expect(mapper.getHierarchyLevel()).to.equal('dataset');
        expect(mapper.getAlternateTitle()).to.equal('Alternativer Titel');
        expect(mapper.getT01_object()).to.deep.include({
            obj_id: 'dataset-1',
            obj_class: '1',
            dataset_alternate_name: 'Alternativer Titel',
            data_language_code: 'en',
            metadata_language_code: 'en',
            metadata_character_set: '4',
            metadata_standard_name: 'ISO 19115:2003/19139',
            metadata_standard_version: '1.0',
            time_type: 'von',
            time_from: '20200101000000000',
            time_to: '20201231000000000',
            time_period: '8'
        });
        expect(mapper.getT01_object().mod_time).to.deep.equal(new Date('2022-05-02T00:00:00'));
        expect(mapper.getT0()).to.be.undefined;
        expect(mapper.getT1()).to.equal('20200101000000000');
        expect(mapper.getT2()).to.equal('20201231000000000');
        expect(mapper.getT0113_dataset_reference()).to.deep.equal([
            { reference_date: '20210301000000000', type: '2' },
            { reference_date: '20220502000000000', type: '3' }
        ]);
    });

    it('maps addresses from the ISO parties', function () {
        expect(mapper.getAddress()).to.deep.equal([
            { institution: 'Amt für Umwelt', lastname: 'Max Muster', street: 'Hauptstr. 1', postcode: '18055', city: 'Rostock', administrative_area_value: 'MV', country_code: 'Deutschland' },
            { institution: 'Stadt Rostock', lastname: undefined, street: undefined, postcode: undefined, city: undefined, administrative_area_value: undefined, country_code: undefined }
        ]);
        expect(mapper.getT012_obj_adr()).to.deep.equal([
            { special_ref: '0', typ: '7' },
            { special_ref: '0', typ: '10' }
        ]);
        expect(mapper.getT021_communication()).to.deep.equal([
            { comm_type: 'Telefon', comm_value: '+49123' },
            { comm_type: 'Email', comm_value: 'max@example.org' },
            { comm_type: 'URL', comm_value: 'https://example.org/amt' },
            { comm_type: 'Email', comm_value: 'info@rostock.de' }
        ]);
    });

    it('maps keywords and spatial fields', function () {
        expect(mapper.getT04Search()).to.deep.equal([
            { searchterm: 'au', type: 'I' },
            { searchterm: 'Wasser', type: 'F' },
            { searchterm: 'Umwelt', type: 'F' },
            { searchterm: 'GOVE', type: 'F' }
        ]);
        expect(mapper.getLocation()).to.equal('Rostock');
        expect(mapper.getT011_obj_geo()).to.deep.equal({
            datasource_uuid: 'dataset-1',
            referencesystem_id: ['http://www.opengis.net/def/crs/EPSG/0/25833'],
            special_base: 'Digitalisiert aus Karten'
        });
        expect(mapper.getT011_obj_geo_scale()).to.deep.equal([{ resolution_ground: '10.5' }]);
        expect(mapper.getSpatialSystem()).to.deep.equal({ referencesystem_value: ['http://www.opengis.net/def/crs/EPSG/0/25833'] });
    });

    it('maps links, formats and constraints', function () {
        expect(mapper.getT017_url_ref()).to.deep.equal([
            { url_link: 'https://example.org/data.csv', content: 'CSV-Download', descr: 'Daten als CSV', special_ref: '9990' },
            { url_link: 'https://example.org/wms?SERVICE=WMS&REQUEST=GetCapabilities', content: 'WMS', descr: '', special_ref: '9999' },
            { url_link: 'https://example.org/landing', content: '', descr: '', special_ref: '5302' }
        ]);
        expect(mapper.getT0110_avail_format()).to.have.deep.members([{ name: 'CSV' }, { name: 'WMS_SRVC' }]);
        expect(mapper.getCapabilitiesURL()).to.deep.equal(['https://example.org/wms?SERVICE=WMS&REQUEST=GetCapabilities']);
        expect(mapper.getObjectUse()).to.deep.equal({ terms_of_use_value: ['Quellenvermerk: Stadt Rostock'] });
        expect(mapper.getObjectUseConstraint()).to.deep.equal({
            license_key: ['5'],
            license_value: [
                'Creative Commons CC Zero License (cc-zero)',
                '{"id":"cc-zero","name":"Creative Commons CC Zero License (cc-zero)","url":"http://www.opendefinition.org/licenses/cc-zero","quelle":""}'
            ]
        });
        expect(mapper.getObjectAccess()).to.deep.equal({
            restriction_key: ['1'],
            restriction_value: ['http://publications.europa.eu/resource/authority/access-right/PUBLIC'],
            terms_of_use: undefined
        });
        expect(mapper.isHvd()).to.be.true;
    });

    it('omits fields without source data', async function () {
        const minimal = await createMapper(MINIMAL_DATASET);
        expect(minimal.getAlternateTitle()).to.be.undefined;
        expect(minimal.getT0()).to.be.undefined;
        expect(minimal.getT1()).to.be.undefined;
        expect(minimal.getT0113_dataset_reference()).to.be.undefined;
        expect(minimal.getAddress()).to.be.undefined;
        expect(minimal.getT012_obj_adr()).to.be.undefined;
        expect(minimal.getT021_communication()).to.be.undefined;
        expect(minimal.getT04Search()).to.be.undefined;
        expect(minimal.getLocation()).to.be.undefined;
        expect(minimal.getT011_obj_geo()).to.deep.equal({ datasource_uuid: 'dataset-2', referencesystem_id: undefined, special_base: undefined });
        expect(minimal.getT011_obj_geo_scale()).to.be.undefined;
        expect(minimal.getSpatialSystem()).to.be.undefined;
        expect(minimal.getT017_url_ref()).to.be.undefined;
        expect(minimal.getT0110_avail_format()).to.be.undefined;
        expect(minimal.getCapabilitiesURL()).to.be.undefined;
        expect(minimal.getObjectUse()).to.be.undefined;
        expect(minimal.getObjectUseConstraint()).to.be.undefined;
        expect(minimal.getObjectAccess()).to.be.undefined;
        expect(minimal.isHvd()).to.be.false;
        expect(minimal.getT01_object()).to.deep.include({ obj_class: '1', data_language_code: 'de', time_type: undefined, time_period: undefined });
    });
});
