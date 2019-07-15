const fs = require('fs');
import {Service} from '@tsed/di';

@Service()
export class LogService {
    get(): string {
        return fs.readFileSync('logs/last-execution.log', "utf8");
    }
}
