/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import { namespaces } from '../../importer/namespaces';

const iso19139: OaiXPaths = {
    prefixMap: {
        'gmd': namespaces.GMD,
        'gco': namespaces.GCO,
        'gml': namespaces.GML,
        'gml32': namespaces.GML_3_2,
        'srv': namespaces.SRV
    },
    nsPrefix: namespaces.GMD,
    mdRoot: 'MD_Metadata',
    idElem: 'fileIdentifier/gco:CharacterString'
};

const lido: OaiXPaths = {
    prefixMap: {
        'lido': namespaces.LIDO
    },
    nsPrefix: namespaces.LIDO,
    mdRoot: 'lido',
    idElem: './lido:lidoRecID'
};

export const oaiXPaths: { [key: string]: OaiXPaths } = {
    iso19139,
    lido
};

export type OaiXPaths = {
    prefixMap: any,
    nsPrefix: string,
    mdRoot: string,
    idElem: string
};