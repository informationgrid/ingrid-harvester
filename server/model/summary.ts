export class Summary {
    numDocs: number;
    numErrors: number;
    elasticErrors: string[];
    appErrors: string[];
    print: () => void;
    [x: string]: any;
}
