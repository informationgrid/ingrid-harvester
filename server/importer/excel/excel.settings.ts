import {ElasticSettings} from '../../utils/elastic.utils';
import {ImporterSettings} from '../../importer';

export type ExcelSettings = {
    filePath: string
} & ElasticSettings & ImporterSettings;
