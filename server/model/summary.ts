import {getLogger} from "log4js";

let logSummary = getLogger('summary');

export class Summary {
    numDocs: number = 0;

    numErrors: number = 0;

    numDuplicates: number = 0;

    skippedDocs: string[] = [];

    elasticErrors: string[] = [];

    appErrors: string[] = [];

    [x: string]: any;

    private headerTitle: string;

    constructor(settings: {description?, type}) {
        this.headerTitle = `Summary of: ${settings.description} (${settings.type})`;
    }

    print() {
        logSummary.info(`---------------------------------------------------------`);
        logSummary.info(this.headerTitle);
        logSummary.info(`---------------------------------------------------------`);
        logSummary.info(`Number of records: ${this.numDocs}`);
        logSummary.info(`Skipped records: ${this.skippedDocs.length}`);
        logSummary.info(`Duplicates: ${this.numDuplicates}`);
        logSummary.info(`Record-Errors: ${this.numErrors}`);
        logSummary.info(`App-Errors: ${this.appErrors.length}`);
        if (logSummary.isDebugEnabled() && this.appErrors.length > 0) {
            logSummary.debug(`\n\t${this.appErrors.join('\n\t')}`);
        }
        logSummary.info(`Elasticsearch-Errors: ${this.elasticErrors.length}`);
        if (logSummary.isDebugEnabled() && this.elasticErrors.length > 0) {
            logSummary.debug(`\n\t${this.elasticErrors.join('\n\t')}`);
        }
        this.additionalSummary();
    }

    additionalSummary() {}
}
