'use strict';

let log = require( 'log4js' ).getLogger( __filename );

class Utils {
    /**
     * Sets the details for the contact that will be displayed in the portal.
     * This method searches for the contactPoint, publisher and creator (in that
     * order) and sets the contact for display in the portal from the first of
     * these items that it finds.
     *
     * @param item the elasticsearch object in mcloud-DCAT format
     */
    static setDisplayContactIn(item) {
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
                contact.name = item.publisher[0].organization;
            }

            if (item.publisher[0].homepage) {
                contact.url = item.publisher[0].homepage;
            }
        } else if (item.creator && item.creator[0]) {
            if (item.creator[0].name) {
                contact.name = item.creator[0].name;
            }
        }

        item.extras.displayContact = contact;
    }
}

module.exports = Utils;

