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

import 'dayjs/locale/de';
import {License} from '@shared/license.model';
import {getLogger} from "log4js";
import {Distribution} from "../../../model/distribution";
import {Agent, Contact, Organization, Person} from "../../../model/agent";
import {DateRange} from "../../../model/dateRange";
import {CkanMapper} from "../../../importer/ckan/ckan.mapper";
import {CswMapper} from "../../../importer/csw/csw.mapper";
import {DcatMapper} from "../../../importer/dcat/dcat.mapper";
import {ExcelMapper} from "../../../importer/excel/excel.mapper";
import {OaiMapper} from "../../../importer/oai/oai.mapper";
import {SparqlMapper} from "../../../importer/sparql/sparql.mapper";
import { RequestOptions } from '../../../utils/http-request.utils';

const dayjs = require('dayjs');
dayjs.locale('de');

export abstract class mcloudMapper<M extends CkanMapper | CswMapper | DcatMapper | ExcelMapper | OaiMapper | SparqlMapper>{

    protected baseMapper: M;

    private _log = getLogger();

    private blacklistedFormats: string[] = [];

    constructor(baseMapper: M) {
        this.baseMapper = baseMapper;
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

    getAccessRights(): string[]{
        return this.baseMapper.getAccessRights();
    }

    async getDistributions(): Promise<Distribution[]>{
        let distributions = await this.baseMapper.getDistributions();
        if (distributions.length === 0) {
            this.baseMapper.valid = false;
            let msg = `Dataset has no links for download/access. It will not be displayed in the portal. Title: '${this.getTitle()}', Id: '${this.getGeneratedId()}'.`;

            this.baseMapper.getSummary().missingLinks++;

            this.baseMapper.valid = false;
            this.baseMapper.getSummary().warnings.push(['No links', msg]);

            this._log.warn(msg);
        }
        return distributions;
    }

    getGeneratedId(): string{
        return this.baseMapper.getGeneratedId()
    }

    getMetadataSource(): any{
        return this.baseMapper.getMetadataSource();
    }

    getHierarchyLevel() {
        return this.baseMapper.getHierarchyLevel();
    }

    getOperatesOn() {
        return this.baseMapper.getOperatesOn();
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

    _getParent(): string{
        return null;
    }

    getParent(): string{
        return this._getParent();
    }

    getCitation(): string{
        return this.baseMapper.getCitation();
    }

    abstract getCategories(): any;


    _getMFundFKZ(): string {
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

    getMFundFKZ(): string {
        return this._getMFundFKZ();
    }

    _getMFundProjectTitle(): string{
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

    getMFundProjectTitle(): string{
        return this._getMFundProjectTitle();
    }

    async getDisplayContacts(): Promise<Organization[] | Person[]>{
        return await this.baseMapper._getDisplayContacts();
    }

    getKeywords(): string[]{
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
        return this.baseMapper.getHarvestErrors();
    }

    getIssued(): Date{
        return this.baseMapper.getIssued();
    }

    getMetadataHarvested(): Date{
        return this.baseMapper.getMetadataHarvested();
    }

    getSubSections(): any[]{
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

    isValid(doc?: any) {
        return this.baseMapper.isValid(doc);
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

    getUrlCheckRequestConfig(uri: string): RequestOptions{
        return this.baseMapper.getUrlCheckRequestConfig(uri);
    }


    getPriority(){
        if(this.baseMapper.getSettings().priority){
            return this.baseMapper.getSettings().priority;
        }
        return undefined;
    }

    executeCustomCode(doc: any) {
        this.baseMapper.executeCustomCode(doc)
    }


    // HELPER METHODS

    static DCAT_THEMES = ['AGRI', 'ECON', 'EDUC','ENER','ENVI','GOVE','HEAL','INTR','JUST','REGI','SOCI','TECH','TRAN'];

    // TODO: refactor into a mapping file
    static dcatThemeUriFromKeyword(keyword: string): string {
        // Check falsy values first
        if (!keyword) return null;

        let code: string = null;
        keyword = keyword.trim();

        switch(keyword) {
            case 'Landwirtschaft, Fischerei, Forstwirtschaft und Nahrungsmittel':
                code = 'AGRI';
                break;

            case 'Wirtschaft und Finanzen':
                code = 'ECON';
                break;

            case 'Bildung, Kultur und Sport':
                code = 'EDUC';
                break;

            case 'Energie':
                code = 'ENER';
                break;

            case 'Umwelt':
                code = 'ENVI';
                break;

            case 'Regierung und öffentlicher Sektor':
                code = 'GOVE';
                break;

            case 'Gesundheit':
                code = 'HEAL';
                break;

            case 'Internationale Themen':
                code = 'INTR';
                break;

            case 'Justiz, Rechtssystem und öffentliche Sicherheit':
                code = 'JUST';
                break;

            case 'Regionen und Städte':
                code = 'REGI';
                break;

            case 'Bevölkerung und Gesellschaft':
                code = 'SOCI';
                break;

            case 'Wissenschaft und Technologie':
                code = 'TECH';
                break;

            case 'Verkehr':
                code = 'TRAN';
                break;

            default:
                return null;
        }
        return code;// ? GenericMapper.DCAT_CATEGORY_URL + code : null;
    }
}


