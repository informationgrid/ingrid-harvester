import {Distribution} from '../../model/generic.mapper';
import {CkanMapper} from './ckan.mapper';
import {getLogger} from 'log4js';

export class CkanRules {

    private static log = getLogger();

    private static NON_DATA_FORMATS = ['rss', 'pdf', 'doc'];

    static containsDocumentsWithData(distributions: Distribution[], mapper: CkanMapper): boolean {
        this.log.debug('Executing rule: containsDocumentsWithData');
        const valid = distributions.some(dist => this.isDataDocument(dist));
        if (!valid) {
            this.log.warn('Document does not contain data links');
            mapper.skipped = true;
            return false;
        }
        return true;
    }

    /**
     * A distribution containing at least one format which belongs to non-data is defined
     * as not a data document.
     * @param dist
     */
    private static isDataDocument(dist: Distribution) {
        return dist.format.every(format => this.NON_DATA_FORMATS.indexOf(format) === -1);
    }
}
