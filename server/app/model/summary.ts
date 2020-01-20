export class Summary {

    private static readonly MAX_ITEMS_TO_SHOW = 10;

    numDocs: number = 0;

    numErrors: number = 0;

    warnings: string[][] = [];

    skippedDocs: string[] = [];

    elasticErrors: string[] = [];

    appErrors: string[] = [];

    [x: string]: any;

    private readonly headerTitle: string;

    constructor(settings: {description?, type}) {
        this.headerTitle = `${settings.description} (${settings.type})`;
    }

    print(logger) {
        logger.info(`---------------------------------------------------------`);
        logger.info(this.headerTitle);
        logger.info(`---------------------------------------------------------`);
        logger.info(`Number of records: ${this.numDocs}`);
        logger.info(`Skipped records: ${this.skippedDocs.length}`);
        Summary.logArray(logger, this.skippedDocs);

        logger.info(`Record-Errors: ${this.numErrors}`);
        logger.info(`Warnings: ${this.warnings.length}`);
        Summary.logArray(logger, this.warnings);

        logger.info(`App-Errors: ${this.appErrors.length}`);
        Summary.logArray(logger, this.appErrors);

        logger.info(`Elasticsearch-Errors: ${this.elasticErrors.length}`);
        Summary.logArray(logger, this.elasticErrors);

        this.additionalSummary();
    }

    private static logArray(logger, list: any) {
        if (logger.isDebugEnabled() && list.length > 0) {
            let listString = `\n\t${list.slice(0, this.MAX_ITEMS_TO_SHOW).join('\n\t')}`;
            if (list.length > this.MAX_ITEMS_TO_SHOW) {
                listString += '\n\t...';
            }
            logger.debug(listString);
        }
    }

    additionalSummary() {}
}
