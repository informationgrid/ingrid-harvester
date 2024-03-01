/**
 * KuLaDig API definitions
 */
export const PAGE_SIZE = 100;

export interface ObjectListRequestParams {
    Seite: number;
    SortierModus: 'Aenderungsdatum'|'Name';
    Sortierrichtung: 'Aufsteigend'|'Absteigend';
}

export interface ObjectListResponse {
    Anzahl: number;
    Gesamtanzahl: number;
    Seite: number;
    AnzahlSeiten: number;
    Ergebnis?: {
        Id: string;
        ZuletztGeaendert: string;
    }[];
}

export interface ObjectResponse {
    Id: string;
    Name: string;
    Beschreibung: string;
    Adresse: string;
    Datenherkunft: {
        Name: string;
        Url: string;
    };
    Schlagwoerter: Record<string, string>;
    Polygon: {
        type: string;
        coordinates: string;
    };
    ZuletztGeaendert: string;
}
