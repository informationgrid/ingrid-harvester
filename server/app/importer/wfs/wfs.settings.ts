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

import {ElasticSettings} from '../../utils/elastic.setting';
import {ImporterSettings} from '../../importer.settings';

export type WfsSettings = {
    version: "2.0.0" | "1.1.0",
    xpaths: {
        capabilities: {
            abstract: string,
            language: string,
            serviceProvider: string,
            title: string
        },
        description: string,
        featureParent: string,
        name: string,
        spatial: string
    },
    count: number,
    resultType?: "hits" | "results",
    typename: string,
    getFeaturesUrl: string,
    eitherKeywords: string[],
    httpMethod: "GET" | "POST",
    featureFilter?: string,
    resolveWithFullResponse?: boolean,
    encoding?: string
} & ElasticSettings & ImporterSettings;

export const DefaultXpathSettings: Partial<WfsSettings> = {
    xpaths: {
        featureParent: '/wfs:FeatureCollection/wfs:member',
        name: '',
        description: '',
        spatial: '',
        capabilities: {
            abstract: '/wfs:WFS_Capabilities/ows:ServiceIdentification/ows:Abstract',
            language: '',
            serviceProvider: '/wfs:WFS_Capabilities/ows:ServiceProvider',
            title: '/wfs:WFS_Capabilities/ows:ServiceIdentification/ows:Title'
        }
    }
}
