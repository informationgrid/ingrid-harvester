import {GenericMapper} from "./generic-mapper";

export class IndexDocument {

    static async create(mapper: GenericMapper) {
        return {
            title: mapper.getTitle(),
            description: mapper.getDescription(),
            publisher: mapper.getPublisher(),
            keywords: mapper.getKeywords(),
            theme: mapper.getThemes(),
            modified: mapper.getModifiedDate(),
            accessRights: mapper.getAccessRights(),
            distribution: await mapper.getDistributions(),
            accrualPeriodicity: mapper.getAccrualPeriodicity(),
            extras: {
                metadata: {
                    modified: mapper.getMetadataModified(),
                    issued: mapper.getMetadataIssued(),
                    source: mapper.getMetadataSource()
                },
                generated_id: mapper.getGeneratedId(),
                license_id: await mapper.getLicenseId(),
                license_url: await mapper.getLicenseURL(),
                realtime: mapper.isRealtime(),
                temporal: mapper.getTemporal(),
                citation: mapper.getCitation(),
                subgroups: mapper.getCategories(),
                mfund_fkz: mapper.getMFundFKZ(),
                mfund_project_title: mapper.getMFundProjectTitle(),
                displayContact: mapper.getDisplayContacts()
            }
        };
    }
}
