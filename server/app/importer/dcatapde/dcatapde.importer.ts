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
import type { Store } from 'n3';
import type { RequestOptions } from '../../utils/http-request.utils.js';
import { RequestDelegate } from '../../utils/http-request.utils.js';
import { DcatapImporter, type DcatapPageResult } from '../dcatap/dcatap.importer.js';
import type { DcatapMapper } from '../dcatap/dcatap.mapper.js';
import { parseRdfPayload } from '../dcatap/dcatap.rdf.js';
import { DcatapdeMapper } from './dcatapde.mapper.js';
import { dcatapdeDefaults, type DcatapdeSettings } from './dcatapde.settings.js';

/**
 * DCAT-AP.de importer: the harvesting of `DcatapImporter` for RDF/XML sources with `DcatapdeMapper` records.
 * The original document is an RDF/XML document with only the record's `dcat:Dataset`, the resources it references inlined (`getHarvestedData()`).
 */
export class DcatapdeImporter extends DcatapImporter<DcatapdeSettings> {

    constructor(settings: DcatapdeSettings) {
        super(settings);
    }

    protected getDefaultSettings(): DcatapdeSettings {
        return dcatapdeDefaults;
    }

    /**
     * DCAT-AP.de sources are RDF/XML (also without `.rdf` extension); relative IRIs are resolved against `sourceURL`.
     */
    protected async fetchAndParse(url: string): Promise<DcatapPageResult> {
        const requestDelegate = new RequestDelegate(DcatapdeImporter.createRequestConfig(this.settings, url));
        const response = await requestDelegate.doRequest();
        const harvestTime = new Date();
        const store = await parseRdfPayload(response, this.settings.sourceURL, 'application/rdf+xml');

        return {
            response,
            store,
            harvestTime
        };
    }

    protected createMapper(recordSubject: Quad_Subject, store: Store, response: string, harvestTime: Date): DcatapMapper<DcatapdeSettings> {
        return new DcatapdeMapper(this.settings, recordSubject, store, response, harvestTime, this.summary);
    }

    /**
     * @returns the RDF/XML document with only the dereferenced `dcat:Dataset` of the record
     */
    protected getRecordOriginalDocument(response: string, recordSubject: Quad_Subject, sourceIdentifier: string, mapper: DcatapMapper<DcatapdeSettings>): any {
        return mapper.getHarvestedData();
    }

    static createRequestConfig(settings: DcatapdeSettings, url?: string): RequestOptions {
        let requestConfig: RequestOptions = {
            method: "GET",
            uri: url || settings.sourceURL,
            json: false,
            timeout: settings.timeout
        };
        return requestConfig;
    }
}
