import {GenericMapper} from "./generic-mapper";

export class IndexDocument {

    static async create(mapper: GenericMapper) {
        return {
            title: mapper.getTitle(),
            description: mapper.getDescription(),
            theme: mapper.getThemes(),
            issued: mapper.getIssued(),
            modified: mapper.getModifiedDate(),
            accrualPeriodicity: mapper.getAccrualPeriodicity(),
            keywords: mapper.getKeywords(),
            creator: mapper.getCreator(),
            publisher: await mapper.getPublisher(),
            accessRights: mapper.getAccessRights(),
            distribution: await mapper.getDistributions(),
            extras: {
                metadata: {
                    source: mapper.getMetadataSource(),
                    issued: mapper.getMetadataIssued(),
                    modified: mapper.getMetadataModified(),
                    harvested: mapper.getMetadataHarvested()
                },
                generated_id: mapper.getGeneratedId(),
                subgroups: mapper.getCategories(),
                license_id: await mapper.getLicenseId(),
                license_title: await mapper.getLicenseTitle(),
                license_url: await mapper.getLicenseURL(),
                harvested_data: mapper.getHarvestedData(),
                harvesting_errors: mapper.getHarvestErrors(),
                subsection: mapper.getSubSections(),
                temporal: mapper.getTemporal(),
                groups: mapper.getGroups(),
                displayContact: await mapper.getDisplayContacts(),
                all: null,
                temporal_start: mapper.getTemporalStart(),
                temporal_end: mapper.getTemporalEnd(),
                realtime: mapper.isRealtime(),
                citation: mapper.getCitation(),
                mfund_fkz: mapper.getMFundFKZ(),
                mfund_project_title: mapper.getMFundProjectTitle()
            }
        };
    }
}
