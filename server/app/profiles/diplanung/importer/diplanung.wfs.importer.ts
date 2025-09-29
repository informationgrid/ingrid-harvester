/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

import * as fs from 'fs';
import { getProxyConfig } from '../../../utils/service.utils.js';
import type { Contact, Organization, Person } from '../../../model/agent.js';
import { CswMapper } from '../../../importer/csw/csw.mapper.js';
import { RequestDelegate } from '../../../utils/http-request.utils.js';
import { WfsImporter } from '../../../importer/wfs/wfs.importer.js';
import type { XPathNodeSelect } from '../../../utils/xpath.utils.js';

export class DiplanungWfsImporter extends WfsImporter {

    async prepareImport(generalInfo: any, capabilitiesDom: Node, select: XPathNodeSelect) {

        // default CRS
        let featureTypesNodes = select('/*[local-name()="WFS_Capabilities"]/*[local-name()="FeatureTypeList"]/*[local-name()="FeatureType"]', capabilitiesDom);
        for (let featureType of featureTypesNodes) {
            let defaultCrs = select('./*[local-name()="DefaultCRS" or local-name()="DefaultSRS"]', featureType, true)?.textContent;
            generalInfo['defaultCrs'] = defaultCrs.replace('urn:ogc:def:crs:EPSG::', '').replace('EPSG:', '');
            break;
        }

        // Regionalschlüssel
        const rs_data = fs.readFileSync('regionalschluessel.json', { encoding: 'utf8', flag: 'r' });
        generalInfo['regionalschluessel'] = JSON.parse(rs_data);

        // general metadata contacts
        // role -> contact
        let contacts: Map<string, Contact> = new Map();
        if (this.settings.contactCswUrl) {
            let response = await RequestDelegate.doRequest({ 
                uri: this.settings.contactCswUrl,
                accept: 'text/xml',
                ...getProxyConfig()
            });
            let responseDom = this.domParser.parseFromString(response);
            let metadata = CswMapper.select('./csw:GetRecordByIdResponse/gmd:MD_Metadata', responseDom, true);
            let xpaths = [
                // for now, only use gmd:contact as pointOfContact (the sparsely populated entry of the two listed below)
                './gmd:contact/gmd:CI_ResponsibleParty[gmd:role/gmd:CI_RoleCode/@codeListValue="pointOfContact"]',
                // './gmd:identificationInfo/gmd:MD_DataIdentification/gmd:pointOfContact/gmd:CI_ResponsibleParty[gmd:role/gmd:CI_RoleCode/@codeListValue="pointOfContact"]',
                './gmd:identificationInfo/gmd:MD_DataIdentification/gmd:pointOfContact/gmd:CI_ResponsibleParty[gmd:role/gmd:CI_RoleCode/@codeListValue="custodian"]'
            ];
            for (let xpath of xpaths) {
                let pointOfContact = CswMapper.select(xpath, metadata, true);
                let role = CswMapper.select('./gmd:role/gmd:CI_RoleCode', pointOfContact, true).getAttribute('codeListValue');
                let contactInfo = CswMapper.select('./gmd:contactInfo/gmd:CI_Contact', pointOfContact, true);
                let address = CswMapper.select('./gmd:address/gmd:CI_Address', contactInfo, true);
                let contact = {
                    fn: CswMapper.getCharacterStringContent(pointOfContact, 'individualName'),
                    hasCountryName: CswMapper.getCharacterStringContent(address, 'country'),
                    hasLocality: CswMapper.getCharacterStringContent(address, 'city'),
                    hasPostalCode: CswMapper.getCharacterStringContent(address, 'postalCode'),
                    hasRegion: CswMapper.getCharacterStringContent(address, 'administrativeArea'),
                    hasStreetAddress: CswMapper.getCharacterStringContent(contactInfo, 'deliveryPoint'),
                    hasEmail: CswMapper.getCharacterStringContent(address, 'electronicMailAddress'),
                    hasOrganizationName: CswMapper.getCharacterStringContent(pointOfContact, 'organisationName'),
                    hasTelephone: CswMapper.getCharacterStringContent(contactInfo, 'phone/gmd:CI_Telephone/gmd:voice'),
                    hasURL: CswMapper.getCharacterStringContent(contactInfo, 'onlineResource/gmd:CI_OnlineResource/gmd:linkage/gmd:URL')
                };
                Object.keys(contact).filter(k => contact[k] == null).forEach(k => delete contact[k]);
                if (!contact.fn?.trim()) {
                    contact.fn = contact.hasOrganizationName;
                }
                contacts.set(role, contact);
            }
        }

        // general contact
        let pointOfContact: Contact = contacts.get('pointOfContact');
        // fallbacks
        if (!pointOfContact?.fn?.trim()) {
            if (this.settings.contactMetadata) {
                pointOfContact = this.settings.contactMetadata;
            }
            else {
                pointOfContact = {
                    fn: ''
                };
            }
        }
        generalInfo['contactPoint'] = pointOfContact;

        // general maintainer
        let maintainer: Person | Organization = { organization: contacts.get('custodian')?.hasOrganizationName };
        // fallbacks
        if (!maintainer.organization?.trim()) {
            if (contacts.get('custodian')?.fn?.trim()) {
                maintainer = { name: contacts.get('custodian')?.fn };
            }
            else if (pointOfContact.hasOrganizationName?.trim()) {
                maintainer = { organization: pointOfContact.hasOrganizationName };
            }
            else if (pointOfContact.fn?.trim()) {
                maintainer = { name: pointOfContact.fn };
            }
            else if (this.settings.maintainer?.['name'] || this.settings.maintainer?.['organization']) {
                maintainer = this.settings.maintainer;
            }
            else {
                maintainer = {
                    name: '',
                    type: ''
                };
            }
        }
        generalInfo['maintainer'] = maintainer;

        return generalInfo;
    }

}