import * as chai from "chai";

export class TestUtils {

    /**
     * Compare two objects where the expected must be a part of the actual object. So it's not
     * necessary to have all fields present and be checked.
     * Deep nested objects cannot be easily compared. So we have to compare parts unfortunately.
     * @param actual is the generated document
     * @param expected is the document we expect to be generated
     * @param extraChecks
     */
    static compareDocuments(actual: any, expected: any, extraChecks?: (actual, expected) => void) {
        actual = JSON.parse(JSON.stringify(actual));

        console.log("Actual doc", JSON.stringify(actual, null, 2));

        if (extraChecks) {
            extraChecks(actual, expected);
        }

        if (expected.extras) {
            // check extras displayContact
            chai.assert.deepInclude(actual.extras.displayContact, expected.extras.displayContact);
            delete expected.extras.displayContact;

            // check extras metadata
            chai.assert.deepInclude(actual.extras.metadata, expected.extras.metadata);
            chai.expect(actual.extras.metadata.modified).not.to.be.null.and.empty;

            // check extras without metadata
            delete expected.extras.metadata;
            chai.assert.deepInclude(actual.extras, expected.extras);

            // check doc without extras
            delete expected.extras;
        }

        chai.assert.deepInclude(actual, expected);
    }

    static prepareIssuedDates(repeat: number, date: string): string[] {
        let issuedDates = [];
        for (let i=0; i<repeat; i++) issuedDates.push(date);
        return issuedDates;
    }
}
