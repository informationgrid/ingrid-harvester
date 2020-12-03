import {GenericMapper} from "./generic.mapper";

export class IndexDocument {

    static async create(mapper: GenericMapper) {
        let result = await {
            priority: mapper.getPriority(),
            access_rights: mapper.getAccessRights(),
            accrual_periodicity: mapper.getAccrualPeriodicity(),
            contact_point: await mapper.getContactPoint(),
            creator: mapper.getCreator(),
            description: mapper.getDescription(),
            distribution: await mapper.getDistributions(),
            extras: {
                all: mapper.getExtrasAllData(),
                citation: mapper.getCitation(),
                display_contact: await mapper.getDisplayContacts(),
                generated_id: mapper.getGeneratedId(),
                groups: mapper.getGroups(),
                harvested_data: mapper.getHarvestedData(),
                license: await mapper.getLicense(),
                metadata: {
                    harvested: mapper.getMetadataHarvested(),
                    harvesting_errors: null, // get errors after all operations been done
                    issued: mapper.getMetadataIssued(),
                    is_valid: null, // checks validity after all operations been done
                    modified: mapper.getMetadataModified(),
                    source: mapper.getMetadataSource(),
                },
                mfund_fkz: mapper.getMFundFKZ(),
                mfund_project_title: mapper.getMFundProjectTitle(),
                realtime: mapper.isRealtime(),
                subgroups: mapper.getCategories(),
                subsection: mapper.getSubSections(),
                spatial: mapper.getSpatial(),
                spatial_text: mapper.getSpatialText(),
                temporal: mapper.getTemporal()
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
        result.extras.metadata.is_valid = mapper.isValid(result);
        mapper.executeCustomCode(result);

        return result;
    }
}
