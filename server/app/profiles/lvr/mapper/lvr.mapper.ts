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
import { getLogger } from 'log4js';
import { OaiMapper } from '../../../importer/oai/lido/oai.mapper';
import { Contact, Organization, Person } from '../../../model/agent';
import { DateRange } from '../../../model/dateRange';
import { Distribution } from "../../../model/distribution";
import { Event, Record, Relation, Repository, Resource, Subject } from '../../../importer/oai/lido/lido.model';

const dayjs = require('dayjs');
dayjs.locale('de');

export class LvrMapper<M extends OaiMapper> {

    protected baseMapper: M;

    private _log = getLogger();

    constructor(baseMapper: M) {
        this.baseMapper = baseMapper;
    }

    getEvents(): Event[] {
        return this.baseMapper.getEvents();
    }

    getRelations(): Relation[] {
        return this.baseMapper.getRelations();
    }

    getSubjects(): Subject[] {
        return this.baseMapper.getSubjects();
    }

    // getClassifications(): Classification[] {

    // }

    // getConcept(): Concept {

    // }

    getRecord(): Record {
        return this.baseMapper.getRecord();
    }

    getRepositories(): Repository[] {
        return this.baseMapper.getRepositories();
    }

    getResources(): Resource[] {
        return this.baseMapper.getResources();
    }
}
