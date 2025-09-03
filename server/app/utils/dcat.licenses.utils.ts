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

import * as fs from 'fs';
import * as xpath from 'xpath';
import log4js from 'log4js';
import { namespaces } from '../importer/namespaces.js';
import { DOMParser } from '@xmldom/xmldom';
import { License } from '@shared/license.model.js';
import { XPathElementSelect } from './xpath.utils.js';

export class DcatLicensesUtils {

    private static log = log4js.getLogger();

    private static licenses: License[];

    static select = <XPathElementSelect>xpath.useNamespaces({
        'dc': namespaces.DC,
        'dcat': namespaces.DCAT,
        'dct': namespaces.DCT,
        'foaf': namespaces.FOAF,
        'owl': namespaces.OWL,
        'org': namespaces.ORG,
        'rdf': namespaces.RDF,
        'rdfs': namespaces.RDFS,
        'skos': namespaces.SKOS,
        'skos-xl': namespaces.SKOS_XL,
        'void': namespaces.VOID,
        'xsd': namespaces.XSD,
        'adms': namespaces.ADMS
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
        try {
            const data = fs.readFileSync('def_licenses.rdf');

            let responseDom = new DOMParser().parseFromString(data.toString());

            let concepts = responseDom.getElementsByTagNameNS(namespaces.SKOS, 'Concept');

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
