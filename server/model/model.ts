export class IndexDocument {

    /**
     *
     * @param {GenericMapper} mapper
     * @returns {{description: *, publisher: *, modified: string, extras: {all: Array, metadata: {modified: string, source: {attribution: string}, issued: string}, realtime: boolean, mfund_project_title: null, subgroups: string[], citation: string, license_id: string, displayContact: {name: string, url: string}[], generated_id: string, license_url: string, temporal: string, mfund_fkz: null}, theme: string[], accessRights: string[], title: *, distribution: {accessURL: string, format: string}[]}}
     */
    static async create(mapper) {
        return {
            title: mapper.getTitle(),
            description: mapper.getDescription(),
            publisher: mapper.getPublisher(),
            theme: mapper.getThemes(),
            modified: mapper.getModifiedDate(),
            accessRights: mapper.getAccessRights(),
            distribution: await mapper.getDistributions(),
            extras: {
                metadata: {
                    modified: mapper.getMetadataModified(),
                    issued: mapper.getMetadataIssued(),
                    source: mapper.getMetadataSource()
                },
                generated_id: mapper.getGeneratedId(),
                license_id: mapper.getLicenseId(),
                license_url: mapper.getLicenseURL(),
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
