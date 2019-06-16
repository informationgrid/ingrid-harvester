import {Summary} from './summary';

export interface ImportResultValues {
    complete: boolean;

    message?: string;

    summary?: Summary;

    progress?: {
        current: number;
        total: number;
    };
}

export class ImportResult {

    static message(message: string) {
        return {
            complete: false,
            message: message
        }
    }

    static running(current: number, total: number, message?: string): ImportResultValues {
        return {
            complete: false,
            progress: {
                current: current,
                total: total
            },
            message: message ? message : undefined
        };
    }

    static complete(summary: Summary, message?: string): ImportResultValues {
        return {
            complete: true,
            summary: summary,
            message: message ? message : undefined
        };
    }
}
