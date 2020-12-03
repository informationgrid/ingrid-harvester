export const doc1 = {
    title: 'Mein Dokument',
    age: 22,
    modified: new Date('2019-04-02'),
    distribution: [],
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
    distribution: []
};
export const doc3 = {
    title: 'Mein D0kument',
    age: 12,
    modified: new Date('2019-03-12'),
    distribution: []
};
export const doc4 = {
    title: 'Mein Spielzeug',
    age: 12,
    modified: new Date('2019-03-12'),
    distribution: []
};

export const doc5 = {
    title: 'My doc',
    uuid: 'uuid_is_same',
    modified: new Date('2020-01-01'),
    distribution: [{
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
    distribution: [{
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
