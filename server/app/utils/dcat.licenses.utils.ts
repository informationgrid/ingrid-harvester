import {DcatMapper} from "../importer/dcat/dcat.mapper";
import {License} from '@shared/license.model';
import {getLogger} from "log4js";

export class DcatLicensesUtils {

    private static log = getLogger();

    private static licenses: License[];

    private static xpath = require('xpath');

    static DC = 'http://purl.org/dc/elements/1.1/';
    static DCAT = 'http://www.w3.org/ns/dcat#';
    static DCT = 'http://purl.org/dc/terms/';
    static FOAF = 'http://xmlns.com/foaf/0.1/';
    static OWL = 'http://www.w3.org/2002/07/owl#';
    static ORG = 'http://www.w3.org/ns/org#';
    static RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    static RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
    static SKOS = 'http://www.w3.org/2004/02/skos/core#';
    static SKOS_XL = 'http://www.w3.org/2008/05/skos-xl#';
    static VOID = 'http://rdfs.org/ns/void#';
    static XSD = 'http://www.w3.org/2001/XMLSchema';
    static ADMS = 'http://www.w3.org/ns/adms#';

    static select = DcatLicensesUtils.xpath.useNamespaces({
        'dc': DcatLicensesUtils.DC,
        'dcat': DcatLicensesUtils.DCAT,
        'dct': DcatLicensesUtils.DCT,
        'foaf': DcatLicensesUtils.FOAF,
        'owl': DcatLicensesUtils.OWL,
        'org': DcatLicensesUtils.ORG,
        'rdf': DcatLicensesUtils.RDF,
        'rdfs': DcatLicensesUtils.RDFS,
        'skos': DcatLicensesUtils.SKOS,
        'skos-xl': DcatLicensesUtils.SKOS_XL,
        'void': DcatLicensesUtils.VOID,
        'xsd': DcatLicensesUtils.XSD,
        'adms': DcatLicensesUtils.ADMS
    });

    constructor() {
    }

    static async get(dcatUrl) {
        if (!DcatLicensesUtils.licenses) DcatLicensesUtils.import();
        return DcatLicensesUtils.licenses[dcatUrl];

    }

    static import() {
        let fs = require('fs');
        try {
            const data = fs.readFileSync('def_licenses.rdf');

            let DomParser = require('xmldom').DOMParser;
            let responseDom = new DomParser().parseFromString(data.toString());

            let concepts = responseDom.getElementsByTagNameNS(DcatLicensesUtils.SKOS, 'Concept');

            if (concepts) {
                DcatLicensesUtils.licenses = [];
                for (let i = 0; i < concepts.length; i++) {
                    let dcatURL = concepts[i].getAttribute('rdf:about');
                    let id = DcatLicensesUtils.select('./dc:identifier', concepts[i], true);
                    let title = DcatLicensesUtils.select('./skos:prefLabel', concepts[i], true);
                    let url = DcatLicensesUtils.select('./foaf:homepage', concepts[i], true);

                    if (id && dcatURL && title && url) {
                        DcatLicensesUtils.licenses[dcatURL] = {
                            id: id.textContent,
                            title: title.textContent,
                            url: url.getAttribute('rdf:resource')
                        };
                    }
                }
            }
        } catch (err) {
            DcatLicensesUtils.log.error(err);
        }

    }
}