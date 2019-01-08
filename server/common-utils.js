'use strict';

let log = require( 'log4js' ).getLogger( __filename );

class Utils {
    static postProcess(item) {
        this._setDisplayContactIn(item);
        this._addIndexTerms(item);
    }

    /**
     * Sets the details for the contact that will be displayed in the portal.
     * This method searches for the contactPoint, publisher and creator (in that
     * order) and sets the contact for display in the portal from the first of
     * these items that it finds.
     *
     * @param item the elasticsearch object in mcloud-DCAT format
     */
    static _setDisplayContactIn(item) {
        let contact = {};

        if (item.contactPoint) {
            if (item.contactPoint['organization-name']) {
                contact.name = item.contactPoint['organization-name'];
            } else if (item.contactPoint.fn) {
                contact.name = item.contactPoint.fn;
            }

            if (item.contactPoint.hasURL) {
                contact.url = item.contactPoint.hasURL;
            }
        } else if (item.publisher && item.publisher[0]) {
            if (item.publisher[0].organization) {
                contact.name = item.publisher[0].organization;
            } else if (item.publisher[0].name) {
                contact.name = item.publisher[0].name;
            }

            if (item.publisher[0].homepage) {
                contact.url = item.publisher[0].homepage;
            }
        } else if (item.extras.creators && item.extras.creators[0]) {
            let creator = item.extras.creators[0];
            if (creator.organisationName) {
                contact.name = creator.organisationName;
            } else if (creator.name) {
                contact.name = creator.name;
            }

            if (creator.homepage) {
                contact.url = creator.homepage;
            }

            // This information is no longer needed
            // FIXME: creators shouldn't be added as a temporary field
            delete item.extras.creators;
        } else if (item.creator && item.creator[0]) {
            if (item.creator[0].name) {
                contact.name = item.creator[0].name;
            }
        }

        item.extras.displayContact = contact;
    }

    /**
     * Copies additional fields to a catch-all field to be indexed for search
     *
     * @param item item to add to elasticsearch
     * @private
     */
    static _addIndexTerms(item) {
        // Make sure that the pokemon item exists (catch 'em all)
        if (!item.extras) item.extras = {};
        if (!item.extras.all) item.extras.all = [];

        // Add
        if (item.keywords) {
            item.keywords.forEach(kw => item.extras.all.push(kw));
        }
        if (item.extras.mfund_fkz) { // mfund_fkz exists and isn't zero (falsy)
            item.extras.all.push(item.extras.mfund_fkz);
            item.extras.all.push('mFUND'); // Add an additional keyword as aid for search
        }
    }
}

module.exports = Utils;

