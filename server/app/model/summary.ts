export class Summary {
    numDocs: number = 0;

    numErrors: number = 0;

    warnings: string[][] = [];

    skippedDocs: string[] = [];

    elasticErrors: string[] = [];

    appErrors: string[] = [];

    [x: string]: any;

    private headerTitle: string;

    constructor(settings: {description?, type}) {
        this.headerTitle = `${settings.description} (${settings.type})`;
    }

    print(logger) {
        logger.info(`---------------------------------------------------------`);
        logger.info(this.headerTitle);
        logger.info(`---------------------------------------------------------`);
        logger.info(`Number of records: ${this.numDocs}`);
        logger.info(`Skipped records: ${this.skippedDocs.length}`);
        if (logger.isDebugEnabled() && this.skippedDocs.length > 0) {
            logger.debug(`\n\t${this.skippedDocs.join('\n\t')}`);
        }
        logger.info(`Record-Errors: ${this.numErrors}`);
        logger.info(`Warnings: ${this.warnings.length}`);
        if (logger.isDebugEnabled() && this.warnings.length > 0) {
            logger.debug(`\n\t${this.warnings.join('\n\t')}`);
        }
        logger.info(`App-Errors: ${this.appErrors.length}`);
        if (logger.isDebugEnabled() && this.appErrors.length > 0) {
            logger.debug(`\n\t${this.appErrors.join('\n\t')}`);
        }
        logger.info(`Elasticsearch-Errors: ${this.elasticErrors.length}`);
        if (logger.isDebugEnabled() && this.elasticErrors.length > 0) {
            logger.debug(`\n\t${this.elasticErrors.join('\n\t')}`);
        }
        this.additionalSummary();
    }

    additionalSummary() {}
}
