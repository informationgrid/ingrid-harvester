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

import type { Geometry } from 'geojson';

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
    Lizenz: {
        Id: string;
        Lizenz: string;
        Url: string;
    };
    Id: string;
    Name: string;
    Beschreibung: string;
    Adresse: string;
    Datenherkunft: {
        Name: string;
        Url: string;
    };
    AnfangVon: string;
    AnfangBis: string;
    EndeVon: string;
    EndeBis: string;
    Schlagwoerter: Record<string, string>;
    Polygon: Geometry;
    ZuletztGeaendert: string;
    UebergeordnetesObjekt: RelatedObject;
    UntergeordneteObjekte: RelatedObject[];
    VerwandteObjekte: RelatedObject[];
    Dokumente: Document[];
}

export interface RelatedObject {
    Id: string;
    Name: string;
}

export enum RelationType {
    Parent = 'UebergeordnetesObjekt',
    Child = 'UntergeordneteObjekte',
    Related = 'VerwandteObjekte'
}

export interface Document {
    Medientyp: MediaType;
    Dateierweiterung: string;
    Ueberschrift: string;
    Beschreibung: string;
    AlternativeBeschreibung: string;
    Thumbnail1Token: string;
    Thumbnail2Token: string;
    Thumbnail3Token: string;
    DownloadToken: string;
}

export enum MediaType {
    Image = 'Bild',
    Video = 'Video',
    Audio = 'Audio',
    Document = 'Dokument'
}

export const getDocumentUrl = (token: string): string => {
    return `https://www.kuladig.de/api/public/Dokument?token=${token}`;
}