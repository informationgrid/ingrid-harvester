export abstract class GenericMapper {
    protected errors: string[] = [];

    protected valid = true;

    protected skipped = false;

    abstract getTitle(): string;

    abstract getDescription(): string;

    abstract async getPublisher(): Promise<any[]>;

    abstract getThemes(): string[];

    abstract getModifiedDate(): Date;

    abstract getAccessRights(): string[];

    abstract async getDistributions(): Promise<any[]>;

    abstract async getLicenseId(): Promise<string>;

    abstract async getLicenseURL(): Promise<string>;

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

    abstract async getDisplayContacts(): Promise<any | any[]>;

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
            url: url
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


    abstract getAccrualPeriodicity(): string;

    abstract getContactPoint(): any;

    abstract getCreator(): { name: string, mbox: string }[] | { name: string, mbox: string };

    abstract getLicenseTitle(): string;

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

}


