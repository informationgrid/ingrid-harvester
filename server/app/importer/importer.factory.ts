import {Importer} from "../importer";
import {CkanImporter} from "./ckan/ckan.importer";
import {ExcelImporter} from "./excel/excel.importer";
import {CswImporter} from "./csw/csw.importer";
import {BfgImporter} from "./csw/bfg.importer";
import {CodedeImporter} from "./csw/codede.importer";
import {OaiImporter} from "./oai/oai.importer";
import {CkanSettings} from './ckan/ckan.settings';
import {ExcelSettings} from './excel/excel.settings';
import {CswSettings} from './csw/csw.settings';
import {OaiSettings} from './oai/oai.settings';
import {DcatImporter} from "./dcat/dcat.importer";

export class ImporterFactory {

    public static get(config: ExcelSettings | CkanSettings | CswSettings | OaiSettings): Importer {
        switch (config.type) {
            case 'CKAN':
                // remove trailing slash from CKAN URL
                let ckanConfig = config as CkanSettings;
                if (ckanConfig.ckanBaseUrl.endsWith('/')) {
                    ckanConfig.ckanBaseUrl = ckanConfig.ckanBaseUrl.slice(0, -1);
                }
                return new CkanImporter(ckanConfig);
            case 'EXCEL': return new ExcelImporter(config);
            case 'CSW': return new CswImporter(config);
            case 'BFG-CSW': return new BfgImporter(config);
            case 'CODEDE-CSW': return new CodedeImporter(config);
            case 'OAI': return new OaiImporter(config);
            case 'DCAT': return new DcatImporter(config);
            default: {
                console.error('Importer not found: ' + config.type);
            }
        }
    }
}
