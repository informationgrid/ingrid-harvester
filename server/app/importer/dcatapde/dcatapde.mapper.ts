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

import type { Quad_Subject } from '@rdfjs/types';
import * as xpath from 'xpath';
import type { Person } from '../../model/agent.js';
import type { Distribution } from '../../model/distribution.js';
import type { XPathElementSelect } from '../../utils/xpath.utils.js';
import { DcatapMapper } from '../dcatap/dcatap.mapper.js';
import { namespaces } from '../namespaces.js';
import type { DcatapdeSettings } from './dcatapde.settings.js';

/**
 * A mapper for DCAT-AP.de datasets: DCAT-AP (`DcatapMapper`) plus the `dcatde:` properties.
 */
export class DcatapdeMapper extends DcatapMapper<DcatapdeSettings> {

    // used by the importer for paging and dereferencing the RDF/XML response
    static select = <XPathElementSelect>xpath.useNamespaces({
        'foaf': namespaces.FOAF,
        'locn': namespaces.LOCN,
        'hydra': namespaces.HYDRA,
        'rdf': namespaces.RDF,
        'rdfs': namespaces.RDFS,
        'dcat': namespaces.DCAT,
        'dcatap': namespaces.DCATAP,
        'dct': namespaces.DCT,
        'skos': namespaces.SKOS,
        'schema': namespaces.SCHEMA,
        'vcard': namespaces.VCARD,
        'dcatde': namespaces.DCATDE,
        'ogc': namespaces.OGC
    });

    /**
     * Extracts and returns an array of keywords defined in the DCAT-AP.de document
     * (the `dcat:keyword` values as they are, unlike `DcatapMapper` without comma split and `dct:subject`).
     */
    getKeywords(): string[] {
        return this.getObjects(this.datasetSubject, namespaces.DCAT + 'keyword').map(term => term.value);
    }

    getPoliticalGeocodingLevelURI(): string | undefined {
        const politicalGeocodingLevelURI = this.getFirstLiteral(this.datasetSubject, namespaces.DCATDE + 'politicalGeocodingLevelURI');
        return politicalGeocodingLevelURI && politicalGeocodingLevelURI.trim() !== '' ? politicalGeocodingLevelURI : undefined;
    }

    getLegalBasis(): string | undefined {
        const legalBasis = this.getFirstLiteral(this.datasetSubject, namespaces.DCATDE + 'legalBasis');
        return legalBasis?.trim() ? legalBasis : undefined;
    }

    getOriginator(): Person[] {
        return this.extractAgents(namespaces.DCATDE + 'originator');
    }

    /**
     * Adds `dcatde:licenseAttributionByText` to the license of `DcatapMapper`.
     */
    protected getDistributionLicense(distribution: Quad_Subject): Distribution['license'] | undefined {
        const license = super.getDistributionLicense(distribution);
        const licenseAttributionByText = this.getFirstLiteral(distribution, namespaces.DCATDE + 'licenseAttributionByText');
        if (license && licenseAttributionByText) {
            license.attribution_by_text = licenseAttributionByText;
        }
        return license;
    }
}
