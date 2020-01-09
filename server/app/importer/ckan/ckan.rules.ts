import {Distribution} from '../../model/generic.mapper';
import {CkanMapper} from './ckan.mapper';
import {getLogger} from 'log4js';

export class RuleResult {
    constructor(
        public valid: boolean,
        public skipped: boolean
    ) {
    }
}

export class CkanRules {

    private static log = getLogger();

    static containsDocumentsWithData(distributions: Distribution[], mapper: CkanMapper, blacklist: string): RuleResult {
        // this.log.debug('Executing rule: containsDocumentsWithData');
        const blacklistedFormats = blacklist.split(',');
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
