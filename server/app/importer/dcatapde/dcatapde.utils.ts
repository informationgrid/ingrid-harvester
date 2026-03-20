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

export const DCAT_CATEGORY_URL = 'http://publications.europa.eu/resource/authority/data-theme/';
export const DCAT_FILE_TYPE_URL = 'http://publications.europa.eu/resource/authority/file-type/';
export const DCAT_LANGUAGE_URL = 'http://publications.europa.eu/resource/authority/language/';
export const DCAT_AVAILABILTY_URL = 'http://publications.europa.eu/resource/authority/planned-availability/';

export const DCAT_THEMES = ['AGRI', 'ECON', 'EDUC', 'ENER', 'ENVI', 'GOVE', 'HEAL', 'INTR', 'JUST', 'REGI', 'SOCI', 'TECH', 'TRAN'];

/** Maps ISO 639-1 two-letter codes to ISO 639-3 three-letter codes used by the EU language authority vocabulary. */
export const ISO_639_1_TO_3: Record<string, string> = {
    de: 'DEU', en: 'ENG', fr: 'FRA', es: 'SPA', it: 'ITA',
    pl: 'POL', nl: 'NLD', pt: 'POR', cs: 'CES', hu: 'HUN',
    ro: 'RON', sv: 'SWE', da: 'DAN', fi: 'FIN', sk: 'SLK',
    bg: 'BUL', hr: 'HRV', lt: 'LIT', lv: 'LAV', et: 'EST',
    sl: 'SLV', ga: 'GLE', mt: 'MLT',
};

// TODO: refactor into a mapping file
export function dcatThemeUriFromKeyword(keyword: string): string {
    if (!keyword) return null;

    let code: string = null;
    keyword = keyword.trim();

    switch (keyword) {
        case 'Landwirtschaft, Fischerei, Forstwirtschaft und Nahrungsmittel':
            code = 'AGRI';
            break;
        case 'Wirtschaft und Finanzen':
            code = 'ECON';
            break;
        case 'Bildung, Kultur und Sport':
            code = 'EDUC';
            break;
        case 'Energie':
            code = 'ENER';
            break;
        case 'Umwelt':
            code = 'ENVI';
            break;
        case 'Regierung und öffentlicher Sektor':
            code = 'GOVE';
            break;
        case 'Gesundheit':
            code = 'HEAL';
            break;
        case 'Internationale Themen':
            code = 'INTR';
            break;
        case 'Justiz, Rechtssystem und öffentliche Sicherheit':
            code = 'JUST';
            break;
        case 'Regionen und Städte':
            code = 'REGI';
            break;
        case 'Bevölkerung und Gesellschaft':
            code = 'SOCI';
            break;
        case 'Wissenschaft und Technologie':
            code = 'TECH';
            break;
        case 'Verkehr':
            code = 'TRAN';
            break;
        default:
            return null;
    }
    return code;
}

export function prettyPrintXml(xml: string, indent = '  '): string {
    let pad = 0;
    return xml
        .replace(/(>)(<)(\/*)/g, '$1\n$2$3')
        .split('\n')
        .map(line => {
            if (line.match(/^<\/\w/)) pad = Math.max(0, pad - 1);
            const padding = indent.repeat(pad);
            if (line.match(/^<\w[^>]*[^/]>/) && !line.match(/<\/\w/)) pad++;
            return padding + line;
        })
        .join('\n');
}
