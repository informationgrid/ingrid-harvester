/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
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

import {DcatMapper} from "../importer/dcat/dcat.mapper";
import {License} from '@shared/license.model';
import {getLogger} from "log4js";

export class DcatLicensesUtils {

    private static log = getLogger();

    private static licenses: License[];

    private static xpath = require('xpath');

    static DC = 'http://purl.org/dc/elements/1.1/';
    static DCAT = 'http://www.w3.org/ns/dcat#';
    static DCT = 'http://purl.org/dc/terms/';
    static FOAF = 'http://xmlns.com/foaf/0.1/';
    static OWL = 'http://www.w3.org/2002/07/owl#';
    static ORG = 'http://www.w3.org/ns/org#';
    static RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    static RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
    static SKOS = 'http://www.w3.org/2004/02/skos/core#';
    static SKOS_XL = 'http://www.w3.org/2008/05/skos-xl#';
    static VOID = 'http://rdfs.org/ns/void#';
    static XSD = 'http://www.w3.org/2001/XMLSchema';
    static ADMS = 'http://www.w3.org/ns/adms#';

    static select = DcatLicensesUtils.xpath.useNamespaces({
        'dc': DcatLicensesUtils.DC,
        'dcat': DcatLicensesUtils.DCAT,
        'dct': DcatLicensesUtils.DCT,
        'foaf': DcatLicensesUtils.FOAF,
        'owl': DcatLicensesUtils.OWL,
        'org': DcatLicensesUtils.ORG,
        'rdf': DcatLicensesUtils.RDF,
        'rdfs': DcatLicensesUtils.RDFS,
        'skos': DcatLicensesUtils.SKOS,
        'skos-xl': DcatLicensesUtils.SKOS_XL,
        'void': DcatLicensesUtils.VOID,
        'xsd': DcatLicensesUtils.XSD,
        'adms': DcatLicensesUtils.ADMS
    });

    constructor() {
    }

    static async get(licenseURL) {
        if(!licenseURL) return undefined;

        if (!DcatLicensesUtils.licenses) DcatLicensesUtils.import();

        if(licenseURL.startsWith("https://")) licenseURL = licenseURL.substring("https://".length);
        if(licenseURL.startsWith("http://")) licenseURL = licenseURL.substring("http://".length);
        return DcatLicensesUtils.licenses[licenseURL];

    }

    static import() {
        let fs = require('fs');
        try {
            const data = fs.readFileSync('def_licenses.rdf');

            let DomParser = require('@xmldom/xmldom').DOMParser;
            let responseDom = new DomParser().parseFromString(data.toString());

            let concepts = responseDom.getElementsByTagNameNS(DcatLicensesUtils.SKOS, 'Concept');

            if (concepts) {
                DcatLicensesUtils.licenses = [];
                for (let i = 0; i < concepts.length; i++) {
                    let dcatURL = concepts[i].getAttribute('rdf:about');
                    let id = DcatLicensesUtils.select('./dc:identifier', concepts[i], true);
                    let title = DcatLicensesUtils.select('./skos:prefLabel', concepts[i], true);
                    let url = DcatLicensesUtils.select('./foaf:homepage', concepts[i], true);

                    if (id && dcatURL && title && url) {
                        let license = {
                            id: id.textContent,
                            title: title.textContent,
                            url: url.getAttribute('rdf:resource')
                        };


                        if(dcatURL.startsWith("https://")) dcatURL = dcatURL.substring("https://".length);
                        if(dcatURL.startsWith("http://")) dcatURL = dcatURL.substring("http://".length);
                        let licenseURL = url.getAttribute('rdf:resource');
                        if(licenseURL.startsWith("https://")) licenseURL = licenseURL.substring("https://".length);
                        if(licenseURL.startsWith("http://")) licenseURL = licenseURL.substring("http://".length);

                        DcatLicensesUtils.licenses[dcatURL] = license;
                        DcatLicensesUtils.licenses[licenseURL] = license;
                    }
                }
            }
        } catch (err) {
            DcatLicensesUtils.log.error(err);
        }

    }
}