export class Summary {
    numDocs: number;
    numErrors: number;
    appErrors: string[];
    print: () => void;
    [x: string]: any;
}
