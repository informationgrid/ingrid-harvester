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

import { mcloudIndexDocument } from '../model/index.document.js';
import { Agent, Contact, Organization, Person } from '../../../model/agent.js';
import { CkanMapper } from '../../../importer/ckan/ckan.mapper.js';
import { CswMapper } from '../../../importer/csw/csw.mapper.js';
import { DateRange } from '../../../model/dateRange.js';
import { DcatMapper } from '../../../importer/dcat/dcat.mapper.js';
import { Distribution } from '../../../model/distribution.js';
import { ExcelMapper } from '../../../importer/excel/excel.mapper.js';
import { IndexDocumentFactory } from '../../../model/index.document.factory.js';
import { License } from '@shared/license.model.js';
import { MetadataSource } from '../../../model/index.document.js';
import { OaiMapper } from '../../../importer/oai/iso19139/oai.mapper.js';
import { SparqlMapper } from '../../../importer/sparql/sparql.mapper.js';

export abstract class mcloudMapper<M extends CkanMapper | CswMapper | DcatMapper | ExcelMapper | OaiMapper | SparqlMapper> implements IndexDocumentFactory<mcloudIndexDocument> {

    protected baseMapper: M;

    // protected log;

    constructor(baseMapper: M) {
        this.baseMapper = baseMapper;
    }

    async create(): Promise<mcloudIndexDocument> {
        let result = await {
            priority: this.getPriority(),
            completion: this.getAutoCompletion(),
            access_rights: this.getAccessRights(),
            accrual_periodicity: this.getAccrualPeriodicity(),
            contact_point: await this.getContactPoint(),
            creator: this.getCreator(),
            description: this.getDescription(),
            distribution: await this.getDistributions(),
            extras: {
                all: this.getExtrasAllData(),
                citation: this.getCitation(),
                display_contact: await this.getDisplayContacts(),
                generated_id: this.getGeneratedId(),
                groups: this.getGroups(),
                harvested_data: this.getHarvestedData(),
                license: await this.getLicense(),
                metadata: {
                    harvested: this.getHarvestingDate(),
                    harvesting_errors: null, // get errors after all operations been done
                    issued: null,
                    is_valid: null, // checks validity after all operations been done
                    modified: null,
                    source: this.getMetadataSource(),
                    merged_from: [this.getGeneratedId()]
                },
                mfund_fkz: this.getMFundFKZ(),
                mfund_project_title: this.getMFundProjectTitle(),
                realtime: this.isRealtime(),
                subgroups: this.getCategories(),
                subsection: this.getSubSections(),
                spatial: this.getSpatial(),
                spatial_text: this.getSpatialText(),
                temporal: this.getTemporal(),
                parent: this.getParent(),
                hierarchy_level: this.getHierarchyLevel(),    // csw only
                operates_on: this.getOperatesOn()             // csw only
            },
            issued: this.getIssued(),
            keywords: this.getKeywords(),
            modified: this.getModifiedDate(),
            publisher: await this.getPublisher(),
            originator: this.getOriginator(),
            theme: this.getThemes(),
            title: this.getTitle()
        };

        result.extras.metadata.harvesting_errors = this.getHarvestErrors();
        result.extras.metadata.is_valid = this.isValid();
        this.executeCustomCode(result);

        return result;
    }

    getTitle(): string{
        return this.baseMapper.getTitle();
    }

    getDescription(): string{
        return this.baseMapper.getDescription();
    }

    async getPublisher(): Promise<Person[]|Organization[]>{
        return await this.baseMapper.getPublisher();
    }

    getThemes(): string[]{
        return this.baseMapper.getThemes();
    }

    getModifiedDate(): Date{
        return this.baseMapper.getModifiedDate()
    }

    getAccessRights(): string[] {
        return this.baseMapper.getAccessRights();
    }

    async getDistributions(): Promise<Distribution[]>{
        let distributions = await this.baseMapper.getDistributions();
        if (distributions.length === 0) {
            let msg = `Dataset has no links for download/access. It will not be displayed in the portal. Title: '${this.getTitle()}', Id: '${this.getGeneratedId()}'.`;

            this.baseMapper.getSummary().missingLinks++;

            this.baseMapper.setValid(false);
            this.baseMapper.getSummary().warnings.push(['No links', msg]);

            this.baseMapper.log.warn(msg);
        }
        return distributions;
    }

    getGeneratedId(): string{
        return this.baseMapper.getGeneratedId()
    }

    getMetadataSource(): MetadataSource {
        return this.baseMapper.getMetadataSource();
    }

    getHierarchyLevel() {
        return undefined;
    }

    getOperatesOn() {
        return undefined;
    }

    isRealtime(): boolean{
        return this.baseMapper.isRealtime();
    }

    getSpatial(): any{
        return this.checkAndFixSpatialData(this.baseMapper.getSpatial());
    }

    checkAndFixSpatialData(spatial : any): any {
        if(spatial) {
            if(spatial.geometries) {
                for(let i = 0; i < spatial.geometries.length; i++){
                    spatial.geometries[i].coordinates = this.checkAndFixSpatialCoordinates(spatial.geometries[i].type, spatial.geometries[i].coordinates);
                }
            }
            if (spatial.coordinates) {
                spatial.coordinates = this.checkAndFixSpatialCoordinates(spatial.type, spatial.coordinates);
                if (spatial.coordinates.length == 0) {
                    spatial = null;
                }
            }
        }
        return spatial;
    }

    checkAndFixSpatialCoordinates(type: string, coordinates : any): any {
        if(coordinates instanceof Array && coordinates[0] instanceof Array && coordinates[0][0] instanceof Array) {
            for (let i = 0; i < coordinates.length; i++) {
                coordinates[i] = this.checkAndFixSpatialCoordinates(type, coordinates[i]);
                if(coordinates[i].length == 0){
                    coordinates.splice(i, 1)
                }
            }
        }
        else if (coordinates instanceof Array && coordinates[0] instanceof Array) {
            for (let i = 1; i < coordinates.length; i++) {
                if((coordinates[i-1][0] === coordinates[i][0]) && (coordinates[i-1][1] === coordinates[i][1])){
                    coordinates.splice(i--, 1);
                }
            }
            if(type.toLowerCase() === 'polygon' && coordinates.length < 4){
                coordinates = [];
            }
        }
        return coordinates;
    }


    getSpatialText(): string{
        return this.baseMapper.getSpatialText();
    }

    getTemporal(): DateRange[]{
        return this.baseMapper.getTemporal();
    }

    getParent(): string{
        return null;
    }

    getCitation(): string{
        return this.baseMapper.getCitation();
    }

    abstract getCategories(): any;


    getMFundFKZ(): string {
        // Detect mFund properties
        let keywords = this.getKeywords();
        if (keywords) {
            let fkzKeyword = keywords.find(kw => kw.toLowerCase().startsWith('mfund-fkz:') || kw.toLowerCase().startsWith('mfund-fkz '));

            if (fkzKeyword) {
                let idx_colon = fkzKeyword.indexOf(':');
                let idx_blank = fkzKeyword.indexOf(' ');
                let idx = (idx_colon > -1 && idx_blank > -1)?Math.min(idx_colon, idx_blank):Math.max(idx_colon, idx_blank);

                let fkz = fkzKeyword.substr(idx + 1);

                if (fkz) return fkz.trim();
            }
        }
        return undefined;
    }

    getMFundProjectTitle(): string{
        // Detect mFund properties
        let keywords = this.getKeywords();
        if (keywords) {
            let mfKeyword: string = keywords.find(kw => kw.toLowerCase().startsWith('mfund-projekt:') || kw.toLowerCase().startsWith('mfund-projekt '));

            if (mfKeyword) {
                let idx_colon = mfKeyword.indexOf(':');
                let idx_blank = mfKeyword.indexOf(' ');
                let idx = (idx_colon > -1 && idx_blank > -1)?Math.min(idx_colon, idx_blank):Math.max(idx_colon, idx_blank);

                let mfName = mfKeyword.substr(idx + 1);

                if (mfName) return mfName.trim();
            }
        }
        return undefined;
    }

    async getDisplayContacts(): Promise<Organization[] | Person[]>{
        return await this.baseMapper.getDisplayContacts();
    }

    getKeywords(): string[] {
        let keywords = this.baseMapper.getKeywords()
        if(keywords != undefined)
            return keywords.map(keyword => keyword.trim());
        return undefined;
    }

    getAutoCompletion(): string[]{
        let title = this.getTitle();
        let parts = title.split(/[^a-zA-Z0-9\u00E4\u00F6\u00FC\u00C4\u00D6\u00DC\u00df]/).filter(s => s.length >= 3).filter(s => s.match(/[a-zA-Z]/));

        let keywords = this.getKeywords()
        if(keywords != undefined)
            parts = parts.concat(keywords.filter(s => s.length >= 3));

        return parts;
    }

    getAccrualPeriodicity(): string{
        return this.baseMapper.getAccrualPeriodicity();
    }

    async getContactPoint(): Promise<Contact>{
        let baseContactPoint = await this.baseMapper.getContactPoint();
        let contactPoint = undefined;
        if(baseContactPoint){
            contactPoint = {}
            if(baseContactPoint.fn) contactPoint.fn = baseContactPoint.fn;
            //if(baseContactPoint.hasLocality) contactPoint.hasLocality = baseContactPoint.hasLocality;
            if(baseContactPoint.hasEmail) contactPoint.hasEmail = baseContactPoint.hasEmail;
            if(baseContactPoint.hasTelephone) contactPoint.hasTelephone = baseContactPoint.hasTelephone;
            if(baseContactPoint.hasUID) contactPoint.hasUID = baseContactPoint.hasUID;
            if(baseContactPoint.hasURL) contactPoint.hasURL = baseContactPoint.hasURL;
            if(baseContactPoint.hasOrganizationName) contactPoint['organization-name'] = baseContactPoint.hasOrganizationName;
            else if(baseContactPoint['organization-name']) contactPoint['organization-name'] = baseContactPoint['organization-name'];
            if(baseContactPoint.hasStreetAddress) contactPoint['street-address'] = baseContactPoint.hasStreetAddress;
            if(baseContactPoint.hasRegion) contactPoint.region = baseContactPoint.hasRegion;
            if(baseContactPoint.hasCountryName) contactPoint['country-name'] = baseContactPoint.hasCountryName;
            if(baseContactPoint.hasPostalCode) contactPoint['postal-code'] = baseContactPoint.hasPostalCode;
        }
        return contactPoint;
    }

    getCreator(): Agent[] | Agent{
        return this.baseMapper.getCreator();
    }

    getHarvestedData(): string{
        return this.baseMapper.getHarvestedData();
    }

    getHarvestErrors() {
        return this.baseMapper.getHarvestingErrors();
    }

    getIssued(): Date{
        return this.baseMapper.getIssued();
    }

    getHarvestingDate(): Date {
        return this.baseMapper.getHarvestingDate();
    }

    getSubSections(): any[] {
        return this.baseMapper.getSubSections();
    }

    getGroups(): string[]{
        return this.baseMapper.getGroups();
    }

    getExtrasAllData(): any[] {
        let all = [];

        let keywords = this.getKeywords();
        if (keywords) {
            keywords.forEach(kw => all.push(kw));
        }

        let mfundFkz = this.getMFundFKZ();
        if (mfundFkz) { // mfund_fkz exists and isn't zero (falsy)
            all.push(mfundFkz);
            all.push('mFUND'); // Add an additional keyword as aid for search
        }
        return all;
    }

    isValid() {
        return this.baseMapper.isValid();
    }

    shouldBeSkipped() {
        return this.baseMapper.shouldBeSkipped();
    }

    getOriginator(): Agent[]{
        return this.baseMapper.getOriginator();
    }

    async getLicense(): Promise<License>{
        return await this.baseMapper.getLicense();
    }

    getPriority(){
        if(this.baseMapper.getSettings().priority){
            return this.baseMapper.getSettings().priority;
        }
        return undefined;
    }

    executeCustomCode(doc: any) {
        this.baseMapper.executeCustomCode(doc);
    }
}
