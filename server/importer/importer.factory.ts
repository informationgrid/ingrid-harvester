import {Importer} from "../importer";
import {CkanImporter, CkanSettings} from "./ckan/ckan.importer";
import {ExcelImporter, ExcelSettings} from "./excel/excel.importer";
import {CswImporter, CswSettings} from "./csw/csw.importer";
import {BfgImporter} from "./csw/bfg.importer";
import {CodedeImporter} from "./csw/codede.importer";

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
