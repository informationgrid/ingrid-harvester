import {Distribution} from './generic.mapper';

export class RuleResult {
    constructor(
        public valid: boolean,
        public skipped: boolean
    ) {
    }
}

export class Rules {

    static containsDocumentsWithData(distributions: Distribution[], blacklistedFormats: string[]): RuleResult {
        const valid = distributions.some(dist => this.isDataDocument(dist, blacklistedFormats));
        if (!valid) {
            return new RuleResult(false, true);
        }
        return new RuleResult(true, false);
    }

    /**
     * A distribution containing at least one format which belongs to non-data is defined
     * as not a data document.
     * @param dist
     * @param blacklistedFormats
     */
    private static isDataDocument(dist: Distribution, blacklistedFormats: string[]) {
        return dist.format.every(format => blacklistedFormats.indexOf(format.toLowerCase()) === -1);
    }
}
