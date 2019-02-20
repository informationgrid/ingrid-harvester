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


export abstract class GenericMapper {

    protected DCAT_CATEGORY_URL = 'http://publications.europa.eu/resource/authority/data-theme/';

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

    abstract getTemporal(): string;

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

    static createDisplayContact(name, url) {
        return {
            name: name,
            homepage: url
        };
    }

    static createSourceAttribution(name) {
        return {
            attribution: name
        };
    }

    static createLicense(description, abbreviation, link) {
        return {
            description: description,
            abbreviation: abbreviation,
            link: link
        };
    }

    static createCreator(name, email) {
        return {
            name: name,
            mbox: email
        };
    }

    static createAgent(name: string, url?: string, about?: string) {
        return {
            name: name,
            homepage: url,
            about: about
        };
    }


    abstract getAccrualPeriodicity(): string;

    abstract getContactPoint(): any;

    abstract getCreator(): Person[] | Person;

    abstract getHarvestedData(): string;


    abstract getTemporalStart(): Date;

    abstract getTemporalEnd(): Date;

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

}


