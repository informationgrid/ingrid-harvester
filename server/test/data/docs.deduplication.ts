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

export const doc1 = {
    title: 'Mein Dokument',
    age: 22,
    modified: new Date('2019-04-02'),
    distributions: [],
    extras: {
        metadata: {
            is_valid: true
        }
    }
};
export const doc2 = {
    title: 'Mein Dokument',
    age: 43,
    modified: new Date('2019-06-15'),
    distributions: []
};
export const doc3 = {
    title: 'Mein D0kument',
    age: 12,
    modified: new Date('2019-03-12'),
    distributions: []
};
export const doc4 = {
    title: 'Mein Spielzeug',
    age: 12,
    modified: new Date('2019-03-12'),
    distributions: []
};

export const doc5 = {
    title: 'My doc',
    uuid: 'uuid_is_same',
    modified: new Date('2020-01-01'),
    distributions: [{
        accessURL: 'not_same'
    }, {
        accessURL: 'also_not_same'
    }],
    extras: {
        metadata: {
            is_valid: true
        }
    }
};

export const doc6 = {
    title: 'My doc',
    uuid: 'uuid_is_same',
    modified: new Date('2020-01-03'),
    distributions: [{
        accessURL: 'pikapika'
    }, {
        accessURL: 'ash'
    }],
    extras: {
        metadata: {
            is_valid: true
        }
    }
};
