import {GenericMapper} from "./generic-mapper";

export class IndexDocument {

    static async create(mapper: GenericMapper) {
        let result = await {
            accessRights: mapper.getAccessRights(),
            accrualPeriodicity: mapper.getAccrualPeriodicity(),
            contactPoint: await mapper.getContactPoint(),
            creator: mapper.getCreator(),
            description: mapper.getDescription(),
            distribution: await mapper.getDistributions(),
            extras: {
                all: mapper.getExtrasAllData(),
                citation: mapper.getCitation(),
                displayContact: await mapper.getDisplayContacts(),
                dcatCategories: mapper.getDCATCategories(),
                generated_id: mapper.getGeneratedId(),
                groups: mapper.getGroups(),
                harvested_data: mapper.getHarvestedData(),
                license: await mapper.getLicense(),
                metadata: {
                    harvested: mapper.getMetadataHarvested(),
                    harvesting_errors: null, // get errors after all operations been done
                    issued: mapper.getMetadataIssued(),
                    isValid: null, // checks validity after all operations been done
                    modified: mapper.getMetadataModified(),
                    source: mapper.getMetadataSource(),
                },
                mfund_fkz: mapper.getMFundFKZ(),
                mfund_project_title: mapper.getMFundProjectTitle(),
                realtime: mapper.isRealtime(),
                subgroups: mapper.getCategories(),
                subsection: mapper.getSubSections(),
                temporal: mapper.getTemporal(),
                temporal_start: mapper.getTemporalStart(),
                temporal_end: mapper.getTemporalEnd()
            },
            issued: mapper.getIssued(),
            keywords: mapper.getKeywords(),
            modified: mapper.getModifiedDate(),
            publisher: await mapper.getPublisher(),
            originator: mapper.getOriginator(),
            theme: mapper.getThemes(),
            title: mapper.getTitle()
        };

        result.extras.metadata.harvesting_errors = mapper.getHarvestErrors();
        result.extras.metadata.isValid = mapper.isValid();
        return result;
    }
}
