export abstract class GenericMapper {

    abstract getTitle(): string;

    abstract getDescription(): string;

    abstract getPublisher(): any;

    abstract getThemes(): string;

    abstract getModifiedDate(): string;

    abstract getAccessRights(): string;

    abstract async getDistributions(): Promise<any[]>;

    abstract async getLicenseId(): Promise<string>;

    abstract async getLicenseURL(): Promise<string>;

    abstract getGeneratedId(): string;

    getMetadataModified(): Date {
        return new Date(Date.now());
    }

    abstract getMetadataSource(): string;

    abstract getMetadataIssued(): Date;

    abstract isRealtime(): boolean;

    abstract getTemporal(): string;

    abstract getCitation(): string;

    abstract getCategories(): string[];

    abstract getMFundFKZ(): string;

    abstract getMFundProjectTitle(): string;

    abstract getDisplayContacts(): any[];

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


    abstract getAccrualPeriodicity(): string;
}

