export abstract class GenericMapper {

    abstract getTitle();

    abstract getDescription();

    abstract getPublisher();

    abstract getThemes();

    abstract getModifiedDate();

    abstract getAccessRights();

    abstract async getDistributions(): Promise<any[]>;

    abstract getLicenseId();

    abstract getLicenseURL();

    abstract getGeneratedId();

    getMetadataModified() {
        return new Date(Date.now());
    }

    abstract getMetadataSource();

    abstract getMetadataIssued();

    abstract isRealtime();

    abstract getTemporal();

    abstract getCitation();

    abstract getCategories();

    abstract getMFundFKZ();

    abstract getMFundProjectTitle();

    abstract getDisplayContacts();

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

}
