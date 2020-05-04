import {ImporterSettings} from '../importer.settings';

export class Summary {

    private MAX_ITEMS_TO_SHOW = 10;

    numDocs: number = 0;

    numErrors: number = 0;

    warnings: string[][] = [];

    skippedDocs: string[] = [];

    elasticErrors: string[] = [];

    appErrors: string[] = [];

    [x: string]: any;

    private readonly headerTitle: string;

    constructor(settings: ImporterSettings) {
        this.headerTitle = `${settings.description} (${settings.type})`;
        if (settings.showCompleteSummaryInfo) {
            this.MAX_ITEMS_TO_SHOW = 1000000;
        }
    }

    print(logger) {
        logger.info(`---------------------------------------------------------`);
        logger.info(this.headerTitle);
        logger.info(`---------------------------------------------------------`);
        logger.info(`Number of records: ${this.numDocs}`);
        logger.info(`Skipped records: ${this.skippedDocs.length}`);
        this.logArray(logger, this.skippedDocs);

        logger.info(`Record-Errors: ${this.numErrors}`);
        logger.info(`Warnings: ${this.warnings.length}`);
        this.logArray(logger, this.warnings);

        logger.info(`App-Errors: ${this.appErrors.length}`);
        this.logArray(logger, this.appErrors);

        logger.info(`Elasticsearch-Errors: ${this.elasticErrors.length}`);
        this.logArray(logger, this.elasticErrors);

        this.additionalSummary();
    }

    toString() : string {
        let result =`---------------------------------------------------------\n`;
        result += this.headerTitle+"\n";
        result += `---------------------------------------------------------\n`;
        result += `Number of records: ${this.numDocs}\n`;
        result += `Skipped records: ${this.skippedDocs.length}\n`;

        result += `Record-Errors: ${this.numErrors}\n`;
        result += `Warnings: ${this.warnings.length}\n`;

        result += `App-Errors: ${this.appErrors.length}\n`;

        result += `Elasticsearch-Errors: ${this.elasticErrors.length}\n`;

        return result;
    }

    private logArray(logger, list: any) {
        if (logger.isDebugEnabled() && list.length > 0) {
            let listString = `\n\t${list.slice(0, this.MAX_ITEMS_TO_SHOW).join('\n\t')}`;
            if (list.length > this.MAX_ITEMS_TO_SHOW) {
                listString += '\n\t...';
            }
            logger.debug(listString);
        }
    }

    additionalSummary() {
    }
}
