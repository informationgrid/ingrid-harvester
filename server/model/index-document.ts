import {GenericMapper} from "./generic-mapper";

export class IndexDocument {

    static async create(mapper: GenericMapper) {
        let result = await {
            title: mapper.getTitle(),
            description: mapper.getDescription(),
            theme: mapper.getThemes(),
            issued: mapper.getIssued(),
            modified: mapper.getModifiedDate(),
            accrualPeriodicity: mapper.getAccrualPeriodicity(),
            contactPoint: await mapper.getContactPoint(),
            keywords: mapper.getKeywords(),
            creator: mapper.getCreator(),
            originator: mapper.getOriginator(),
            publisher: await mapper.getPublisher(),
            accessRights: mapper.getAccessRights(),
            distribution: await mapper.getDistributions(),
            extras: {
                metadata: {
                    source: mapper.getMetadataSource(),
                    issued: mapper.getMetadataIssued(),
                    modified: mapper.getMetadataModified(),
                    harvested: mapper.getMetadataHarvested(),
                    harvesting_errors: null, // get errors after all operations been done
                    isValid: null, // checks validity after all operations been done
                },
                generated_id: mapper.getGeneratedId(),
                subgroups: mapper.getCategories(),
                license: await mapper.getLicense(),
                harvested_data: mapper.getHarvestedData(),
                subsection: mapper.getSubSections(),
                temporal: mapper.getTemporal(),
                groups: mapper.getGroups(),
                displayContact: await mapper.getDisplayContacts(),
                all: mapper.getExtrasAllData(),
                temporal_start: mapper.getTemporalStart(),
                temporal_end: mapper.getTemporalEnd(),
                realtime: mapper.isRealtime(),
                citation: mapper.getCitation(),
                mfund_fkz: mapper.getMFundFKZ(),
                mfund_project_title: mapper.getMFundProjectTitle()
            }
        };

        result.extras.metadata.harvesting_errors = mapper.getHarvestErrors();
        result.extras.metadata.isValid = mapper.isValid();
        return result;
    }
}
