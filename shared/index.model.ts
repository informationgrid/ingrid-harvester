export interface Index {
    name: string;
    numDocs?: number;
    health?: string;
    status?: 'open'|'closed';
}
