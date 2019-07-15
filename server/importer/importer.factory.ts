import {Importer} from "../importer";
import {CkanImporter} from "./ckan/ckan.importer";
import {ExcelImporter} from "./excel/excel.importer";
import {CswImporter} from "./csw/csw.importer";
import {BfgImporter} from "./csw/bfg.importer";
import {CodedeImporter} from "./csw/codede.importer";
import {CkanSettings} from './ckan/ckan.settings';
import {ExcelSettings} from './excel/excel.settings';
import {CswSettings} from './csw/csw.settings';

export class ImporterFactory {

    public static get(config: ExcelSettings | CkanSettings | CswSettings): Importer {
        switch (config.type) {
            case 'CKAN': return new CkanImporter(<CkanSettings>config);
            case 'EXCEL': return new ExcelImporter(config);
            case 'CSW': return new CswImporter(config);
            case 'BFG-CSW': return new BfgImporter(config);
            case 'CODEDE-CSW': return new CodedeImporter(config);
            default: {
                console.error('Importer not found: ' + config.type);
            }
        }
    }
}
