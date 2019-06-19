import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {ImportLogMessage} from '../../model/import.result';
import {Service} from '@tsed/di';

/**
 * This service handles access to a file which contains the last import summary
 * of each harvester. This is used to display as an information about the last
 * import process.
 */
@Service()
export class SummaryService {
    private summaries: ImportLogMessage[] = [];
    private summaryPath = 'data/importLogSummaries.json';

    constructor() {

        if (existsSync(this.summaryPath)) {
            let summaryFile = readFileSync(this.summaryPath);
            this.summaries = JSON.parse(summaryFile.toString());
        } else {
            if (!existsSync('data')) mkdirSync('data');

            writeFileSync(this.summaryPath, '[]');
            this.summaries = [];
        }

    }

    /**
     * Get the last import summary of the harvester with the given ID
     * @param id is the ID the harvester is identified with
     */
    get(id: number): ImportLogMessage {
        return this.summaries.find(s => s.id === id);
    }

    /**
     * Get all import summaries from each harvester.
     */
    getAll(): ImportLogMessage[] {
        return this.summaries;
    }

    /**
     * Update the json file containing all last import summaries of the harvesters
     * by replacing or adding the given summary.
     * @param summary
     */
    update(summary: ImportLogMessage): void {
        let position = this.summaries.findIndex(s => s.id === summary.id);

        // add summary to the end if it was not found, otherwise overwrite it
        if (position === -1) {
            this.summaries.push(summary);
        } else {
            this.summaries[position] = summary;
        }

        writeFileSync(this.summaryPath, JSON.stringify(this.summaries, null, 2));
    }
}
