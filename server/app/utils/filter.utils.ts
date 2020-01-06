import {ImporterSettings} from "../importer.settings";

export class FilterUtils {


    constructor(private settings: ImporterSettings) {
    }

    isIdAllowed(id: string) {
        if (this.settings.blacklistedIds) {
            const isWhitelisted = this.settings.whitelistedIds.indexOf(id) !== -1;
            return isWhitelisted || this.settings.blacklistedIds.indexOf(id) === -1;
        }
        return true;
    }

}