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

import { Harvester } from '@shared/harvester';
import { MiscUtils } from '../../../utils/misc.utils';
import { MsWfsMapper } from './ms.wfs.mapper';
import { RequestDelegate } from '../../../utils/http-request.utils';
import { WfsImporter } from '../wfs.importer';
import { WfsMapper } from '../wfs.mapper';

export class MsWfsImporter extends WfsImporter {

    protected supportsPaging: boolean = true;

    constructor(settings: Harvester, requestDelegate?: RequestDelegate) {
        super(MiscUtils.merge(settings, { memberElement: 'wfs:member'}));
    }

    getMapper(settings: Harvester, feature, harvestTime, summary, generalInfo): WfsMapper {
        return new MsWfsMapper(settings, feature, harvestTime, summary, generalInfo);
    }
}
