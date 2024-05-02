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

import 'dayjs/locale/de';
import { DateRange } from '../../../model/dateRange';
import { GeometryInformation, Keyword, Relation, Media } from '../model/index.document';
import { License } from '@shared/license.model';
import { LvrMapper } from './lvr.mapper';
import { OaiMapper } from '../../../importer/oai/lido/oai.mapper';
import { MetadataSource } from 'model/index.document';

const dayjs = require('dayjs');
dayjs.locale('de');

export class LvrOaiMapper extends LvrMapper<OaiMapper> {

    constructor(baseMapper: OaiMapper) {
        super(baseMapper);
    }

    getIdentifier(): string {
        throw new Error('Method not implemented.');
    }

    getTitle(): string {
        throw new Error('Method not implemented.');
    }

    getDescription(): string {
        throw new Error('Method not implemented.');
    }

    getSpatial(): GeometryInformation[] {
        throw new Error('Method not implemented.');
    }

    getTemporal(): DateRange {
        throw new Error('Method not implemented.');
    }

    getKeywords(): Keyword[] {
        throw new Error('Method not implemented.');
    }

    getRelations(): Relation[] {
        throw new Error('Method not implemented.');
    }

    getMedia(): Media[] {
        throw new Error('Method not implemented.');
    }

    getLicense(): License {
        throw new Error('Method not implemented.');
    }

    getVector(): object {
        throw new Error('Method not implemented.');
    }
}
