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

import type { DcatapdeMapper } from '../../../importer/dcatapde/dcatapde.mapper.js';
import type { IndexContact } from '../../../model/index.document.js';
import { ingridDcatapMapper } from './ingrid.dcatap.mapper.js';

/**
 * Index document of a DCAT-AP.de dataset: `ingridDcatapMapper` plus the `dcatde:` properties.
 */
export class ingridDcatapdeMapper extends ingridDcatapMapper<DcatapdeMapper> {

    getLegalBasis(): string {
        return this.baseMapper.getLegalBasis();
    }

    getPoliticalGeocodingLevel(): string {
        return this.baseMapper.getPoliticalGeocodingLevelURI();
    }

    protected getOldContacts(): any[] {
        return [
            ...super.getOldContacts(),
            ...this.baseMapper.getOriginator().map(contact => {return {role: this.getRoleId("originator"), ...contact}}),
        ];
    }

    async getContacts(): Promise<IndexContact[]> {
        return [
            ...await super.getContacts(),
            ...this.baseMapper.getOriginator().map(this.toIndexContact('originator')),
        ];
    }
}
