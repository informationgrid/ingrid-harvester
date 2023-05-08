/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import { CswImporter } from '../../../importer/csw/csw.importer';
import { CswMapper } from '../../../importer/csw/csw.mapper';
import { DiplanungCswMapper } from '../mapper/diplanung.csw.mapper';
import { DOMParser as DomParser } from '@xmldom/xmldom';
import { RequestDelegate } from '../../../utils/http-request.utils';

export class DiplanungCswImporter extends CswImporter {
    constructor(settings, requestDelegate?: RequestDelegate) {
        super(settings, requestDelegate);
    }

    getMapper(settings, record, harvestTime, storedData, summary, generalInfo): DiplanungCswMapper {
        return new DiplanungCswMapper(settings, record, harvestTime, storedData, summary, generalInfo);
    }

    protected async postHarvestingHandling() {
        this.createDataServiceCoupling();
    }

    private createDataServiceCoupling() {
        let bulkData = this.elastic._bulkData;
        let servicesByDataIdentifier = [];
        let servicesByFileIdentifier = [];
        for(let i = 0; i < bulkData.length; i++){
            let doc = bulkData[i];
            if(doc.extras){
                let harvestedData = doc.extras.harvested_data;
                let xml = new DomParser().parseFromString(harvestedData, 'application/xml');
                let identifierList = CswMapper.select('.//srv:coupledResource/srv:SV_CoupledResource/srv:identifier/gco:CharacterString', xml)
                if(identifierList && identifierList.length > 0){
                    for(let j = 0; j < identifierList.length; j++){
                        let identifer = identifierList[j].textContent;
                        if(!servicesByDataIdentifier[identifer]){
                            servicesByDataIdentifier[identifer] = [];
                        }
                        servicesByDataIdentifier[identifer] = servicesByDataIdentifier[identifer].concat(doc.distributions);
                    }
                } else {
                    identifierList = CswMapper.select('./gmd:MD_Metadata/gmd:identificationInfo/srv:SV_ServiceIdentification/srv:operatesOn', xml)
                    if (identifierList && identifierList.length > 0) {
                        for (let j = 0; j < identifierList.length; j++) {
                            let identifer = identifierList[j].getAttribute("uuidref")
                            if (!servicesByFileIdentifier[identifer]) {
                                servicesByFileIdentifier[identifer] = [];
                            }
                            servicesByFileIdentifier[identifer] = servicesByFileIdentifier[identifer].concat(doc.distributions);
                        }
                    }
                }
            }
        }

        for(let i = 0; i < bulkData.length; i++){
            let doc = bulkData[i];
            if(doc.extras){
                let harvestedData = doc.extras.harvested_data;
                let xml = new DomParser().parseFromString(harvestedData, 'application/xml');
                let identifierList = CswMapper.select('./gmd:MD_Metadata/gmd:identificationInfo/gmd:MD_DataIdentification/gmd:citation/gmd:CI_Citation/gmd:identifier/gmd:MD_Identifier/gmd:code/gco:CharacterString', xml)
                if(identifierList){
                    for(let j = 0; j < identifierList.length; j++){
                        let identifer = identifierList[j].textContent;
                        if(servicesByDataIdentifier[identifer]){
                            doc.distributions = doc.distributions.concat(servicesByDataIdentifier[identifer]);
                        }
                    }
                }
                identifierList = CswMapper.select('./gmd:MD_Metadata/gmd:fileIdentifier/gco:CharacterString', xml)
                if(identifierList){
                    for(let j = 0; j < identifierList.length; j++){
                        let identifer = identifierList[j].textContent;
                        if(servicesByFileIdentifier[identifer]){
                            doc.distributions = doc.distributions.concat(servicesByFileIdentifier[identifer]);
                        }
                    }
                }
            }
        }
    }
}