import {OptionsWithUri} from 'request-promise';
import * as moment from 'moment';

moment.locale('de');

export interface Distribution {
    format: string;
    accessURL: string;
}
export interface Agent {
    homepage?: string;
    mbox?: string;
}
export interface Person extends Agent {
    name: string;
}
export interface Organization extends Agent {
    organization: string;
}
export interface License {
    id: string;
    title: string;
    url: string;
}
export interface DateRange {
    start?: Date,
    end?: Date,
    custom?: string
}


export abstract class GenericMapper {

    protected moment = moment;

    protected sizeMap = {
        byte: 1,
        bytes: 1,
        kilobyte: 1000,
        kilobytes: 1000,
        kb: 1000,
        megabyte: 10000000,
        megabytes: 10000000,
        mb: 10000000,
        gigabyte: 10000000000,
        gigabytes: 10000000000,
        gb: 10000000000,
    };

    protected static DCAT_CATEGORY_URL = 'http://publications.europa.eu/resource/authority/data-theme/';

    protected errors: string[] = [];

    protected valid = true;

    public skipped = false;

    abstract getTitle(): string;

    abstract getDescription(): string;

    abstract async getPublisher(): Promise<Person[]|Organization[]>;

    abstract getThemes(): string[];

    abstract getModifiedDate(): Date;

    abstract getAccessRights(): string[];

    abstract async getDistributions(): Promise<any[]>;

    abstract getGeneratedId(): string;

    getMetadataModified(): Date {
        return new Date(Date.now());
    }

    abstract getMetadataSource(): any;

    abstract getMetadataIssued(): Date;

    abstract isRealtime(): boolean;

    abstract getTemporal(): DateRange;

    abstract getCitation(): string;

    abstract getCategories(): string[];

    abstract getMFundFKZ(): string;

    abstract getMFundProjectTitle(): string;

    abstract async getDisplayContacts(): Promise<Organization[] | Person[]>;

    abstract getKeywords(): string[];

    // HELPER METHODS

    static createPublisher(name, url) {
        return {
            organization: name,
            homepage: url
        };
    }

    static createSourceAttribution(name) {
        return {
            attribution: name
        };
    }

    abstract getAccrualPeriodicity(): string;

    abstract async getContactPoint(): Promise<any>;

    abstract getCreator(): Person[] | Person;

    abstract getHarvestedData(): string;

    getHarvestErrors() {
        return this.errors.length === 0 ? undefined : this.errors;
    }

    abstract getIssued(): Date;

    abstract getMetadataHarvested(): Date;

    abstract getSubSections(): any[];

    abstract getGroups(): string[];

    getExtrasAllData(): any[] {
        let all = [];

        let keywords = this.getKeywords();
        if (keywords) {
            keywords.forEach(kw => all.push(kw));
        }

        let mfundFkz = this.getMFundFKZ();
        if (mfundFkz) { // mfund_fkz exists and isn't zero (falsy)
            all.push(mfundFkz);
            all.push('mFUND'); // Add an additional keyword as aid for search
        }
        return all;
    }

    isValid() {
        return this.valid;
    }

    shouldBeSkipped() {
        return this.skipped;
    }

    abstract getOriginator(): Person[]|Organization[];

    abstract async getLicense(): Promise<License>;

    abstract getUrlCheckRequestConfig(uri: string): OptionsWithUri;

    // TODO: refactor into a mapping file
    static dcatThemeUriFromKeyword(keyword: string): string {
        // Check falsy values first
        if (!keyword) return null;

        let code: string = null;
        keyword = keyword.trim();

        switch(keyword) {
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
        return code ? GenericMapper.DCAT_CATEGORY_URL + code : null;
    }

}


