import {Summary} from './summary';

export interface ImportLogMessage {
    id?: number;

    complete: boolean;

    message?: string;

    summary?: Summary;

    progress?: {
        current: number;
        total: number;
    };

    duration?: number;

    lastExecution?: Date;
}

export class ImportResult {

    static message(message: string) {
        return {
            complete: false,
            message: message
        }
    }

    static running(current: number, total: number, message?: string): ImportLogMessage {
        return {
            complete: false,
            progress: {
                current: current,
                total: total
            },
            message: message ? message : undefined
        };
    }

    static complete(summary: Summary, message?: string): ImportLogMessage {
        return {
            complete: true,
            summary: summary,
            message: message ? message : undefined
        };
    }
}
