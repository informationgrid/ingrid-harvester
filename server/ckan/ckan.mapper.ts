/**
 * A mapper for CKAN documents.
 */
import {GenericMapper} from "../model/generic-mapper";

export class CkanToElasticsearchMapper extends GenericMapper {

    private data: any;

    constructor(data) {
        super();
        this.data = data;
    }

    getAccessRights() {
    }

    getCategories() {
    }

    getCitation() {
    }

    getDescription() {
    }

    getDisplayContacts() {
    }

    async getDistributions(): Promise<any[]> {
        return undefined;
    }

    getGeneratedId() {
    }

    getLicenseId() {
    }

    getLicenseURL() {
    }

    getMFundFKZ() {
    }

    getMFundProjectTitle() {
    }

    getMetadataIssued() {
    }

    getMetadataSource() {
    }

    getModifiedDate() {
    }

    getPublisher() {
    }

    getTemporal() {
    }

    getThemes() {
    }

    getTitle() {
    }

    isRealtime() {
    }


}
